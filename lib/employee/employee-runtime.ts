import {
  EmployeeUnderstanding,
  type NormalizedEmployeeEvent,
} from "./employee-understanding";

import {
  InformationExtractor,
} from "./information-extractor";

import { EmployeeBrain } from "./employee-brain";
import {
  EmployeeActions,
  type EmployeeActionResult,
} from "./employee-actions";
import type {
  BusinessHours,
} from "./appointment-availability";

import { ConversationStateEngine } from "./conversation-state";
import { GoalEngine } from "./goal-engine";
import { WorkflowEngine } from "./workflow-engine";
import { PlanningEngine } from "./planning-engine";
import { LearningEngine } from "./learning-engine";
import { BusinessBrain } from "./business-brain";

import { CustomerService } from "@/lib/services/customer-service";
import { ConversationService } from "@/lib/services/conversation-service";
import { BusinessConfigurationService } from "@/lib/services/business-configuration-service";
import {
  LearningService,
  type ActionLearningEvidence,
} from "@/lib/services/learning-service";

export class EmployeeRuntime {
  private readonly understanding =
    new EmployeeUnderstanding();

  private readonly extractor =
    new InformationExtractor();

  private readonly customers =
    new CustomerService();

  private readonly conversations =
    new ConversationService();

  private readonly conversation =
    new ConversationStateEngine();

  private readonly workflow =
    new WorkflowEngine();

  private readonly goals =
    new GoalEngine();

  private readonly planner =
    new PlanningEngine();

  private readonly brain =
    new EmployeeBrain();

  private readonly actions =
    new EmployeeActions();

  private readonly learning =
    new LearningEngine();

  private readonly durableLearning =
    new LearningService();

  private readonly business =
    new BusinessBrain();

  private readonly businessConfiguration =
    new BusinessConfigurationService();

  public async process(
    event: NormalizedEmployeeEvent,
  ) {
    //
    // STEP 1
    // Normalize incoming event
    //
    const normalized =
      this.understanding.normalize(event);

    //
    // STEP 2
    // Extract structured information
    //
    const extracted =
      this.extractor.extract(
        normalized.content,
      );

    //
    // STEP 3
    // Resolve business
    //
    const businessId =
      (event as { businessId?: string }).businessId ??
      process.env.DEFAULT_BUSINESS_ID;

    //
    // STEP 4
    // Load tenant-specific configuration
    //
    const businessConfiguration =
      businessId
        ? await this.businessConfiguration.getOrCreate(
            businessId,
          )
        : null;

    const bookingRules =
      businessConfiguration?.booking_rules ??
      {};

    const businessHours =
      businessConfiguration?.business_hours as
        | BusinessHours
        | undefined;

    const bookingTimezone =
      typeof bookingRules.timezone ===
      "string"
        ? bookingRules.timezone
        : undefined;

    const appointmentDurationMinutes =
      typeof bookingRules.default_duration_minutes ===
      "number"
        ? bookingRules.default_duration_minutes
        : undefined;

    //
    // STEP 5
    // Resolve durable customer identity
    //
    // The database UUID is the source of truth whenever
    // the incoming event contains enough customer identity
    // information to resolve a customer.
    //
    let customer = null;

    if (businessId) {
      customer =
        await this.customers.getOrCreate({
          businessId,
          phone: extracted.phone,
          name: extracted.name,
        });
    }

    const databaseCustomerId =
      customer?.id ?? null;

    //
    // Internal workflow engines still need a stable key
    // for events where a durable customer cannot yet be
    // resolved.
    //
    // Once the customer exists, use the durable UUID so
    // runtime state and database state share one identity.
    //
    const conversationCustomerId =
      databaseCustomerId ??
      normalized.customerId ??
      "anonymous";

    //
    // STEP 6
    // Load durable conversation history
    //
    const durableConversation =
      databaseCustomerId
        ? await this.conversations.getHistory(
            databaseCustomerId,
          )
        : null;

    //
    // STEP 7
    // Workflow
    //
    const workflow =
      this.workflow.update(
        conversationCustomerId,
        extracted,
      );

    //
    // STEP 8
    // Conversation state
    //
    const conversation =
      this.conversation.syncWithWorkflow(
        conversationCustomerId,
        {
          stage:
            workflow.stage,
          nextObjective:
            workflow.nextObjective,
        },
      );

    //
    // STEP 9
    // Goal
    //
    const goal =
      this.goals.getActiveGoal(
        conversationCustomerId,
      );

    //
    // STEP 10
    // Planning
    //
    const plan =
      this.planner.createPlan(
        conversationCustomerId,
        {
          nextObjective:
            workflow.nextObjective,
          stage:
            workflow.stage,
        },
      );

    //
    // STEP 11
    // Load business-scoped durable learning, then decide
    //
    let actionLearning: Record<
      string,
      ActionLearningEvidence
    > = {};

    if (businessId) {
      try {
        actionLearning =
          await this.durableLearning.getEvidenceForActions(
            businessId,
            [
              "REQUEST_ESTIMATE",
              "BOOK_APPOINTMENT",
              "FOLLOW_UP",
              "RESPOND",
            ],
          );
      } catch (learningError) {
        console.error(
          "DURABLE LEARNING READ ERROR:",
          learningError,
        );
      }
    }

    const decision =
      this.brain.decide({
        message:
          normalized.content,
        conversation,
        goal,
        qualificationComplete:
          workflow.stage ===
          "READY_TO_BOOK",
        confidence: 100,
        previousTranscript:
          durableConversation?.transcript,
        previousSummary:
          durableConversation?.summary,
        actionLearning,
      });

    //
    // STEP 12
    // Execute plan
    //
    let result: EmployeeActionResult | null =
      null;

    for (const step of plan.steps) {
      if (
        !this.planner.dependenciesCompleted(
          conversationCustomerId,
          step.id,
        )
      ) {
        this.planner.blockStep(
          conversationCustomerId,
          step.id,
        );

        continue;
      }

      //
      // Appointment and follow-up persistence require
      // a real database customer UUID.
      //
      const requiresDatabaseCustomer =
        step.action === "BOOK_APPOINTMENT" ||
        step.action === "FOLLOW_UP";

      //
      // Never pretend an ephemeral/session identifier is
      // a database UUID for persistence-sensitive actions.
      //
      if (
        requiresDatabaseCustomer &&
        !databaseCustomerId
      ) {
        const stepResult: EmployeeActionResult = {
          success: false,
          action: step.action,
          message:
            "A durable customer identity is required before this action can execute.",
        };

        if (
          result === null ||
          step.action === decision.action
        ) {
          result = stepResult;
        }

        this.planner.failStep(
          conversationCustomerId,
          step.id,
        );

        continue;
      }

      const actionCustomerId =
        requiresDatabaseCustomer
          ? databaseCustomerId!
          : conversationCustomerId;

      const permission =
        businessId
          ? await this.businessConfiguration.canExecute(
              businessId,
              step.action,
            )
          : {
              allowed: false,
              requiresApproval: true,
              reason:
                "Business could not be resolved.",
            };

      let stepResult: EmployeeActionResult;

      if (!permission.allowed) {
        stepResult = {
          success: false,
          action: step.action,
          message:
            permission.reason ??
            "Action is not allowed for this business.",
        };
      } else if (
        permission.requiresApproval
      ) {
        stepResult = {
          success: false,
          action: step.action,
          message:
            `Owner approval required before ${step.action}.`,
        };
      } else {
        stepResult =
          await this.actions.execute(
            step.action,
            {
              customerId:
                actionCustomerId,
              businessId,
              content:
                normalized.content,
              source:
                normalized.source,
              qualification:
                workflow.qualification,
              bookingTimezone,
              appointmentDurationMinutes,
              businessHours,
            },
          );
      }

      if (
        result === null ||
        step.action === decision.action
      ) {
        result = stepResult;
      }

      if (stepResult.success) {
        this.planner.completeStep(
          conversationCustomerId,
          step.id,
        );
      } else {
        this.planner.failStep(
          conversationCustomerId,
          step.id,
        );
      }
    }

    //
    // STEP 13
    // Update runtime conversation state
    //
    if (result) {
      this.conversation.setEmployeeAction(
        conversationCustomerId,
        result.action,
      );
    }

    //
    // STEP 14
    // Persist this interaction
    //
    // This is the durable history that survives process
    // restarts and serverless instance replacement.
    //
    let persistedConversation =
      durableConversation;

    if (databaseCustomerId) {
      persistedConversation =
        await this.conversations.recordTurn({
          customerId:
            databaseCustomerId,
          source:
            normalized.source,
          customerMessage:
            normalized.content,
          employeeMessage:
            result?.message,
        });
    }

    //
    // STEP 15
    // Learning + business intelligence
    //
    if (result) {
      this.learning.record({
        customerId:
          conversationCustomerId,
        workflow:
          workflow.stage,
        action:
          decision.action,
        success:
          result.success,
        confidence:
          decision.score,
        outcome:
          result.message,
      });

      if (businessId) {
        try {
          await this.durableLearning.record({
            businessId,
            customerId:
              databaseCustomerId,
            action:
              decision.action,
            outcome:
              result.success
                ? "success"
                : "failed",
            confidence:
              decision.score,
          });
        } catch (learningError) {
          console.error(
            "DURABLE LEARNING WRITE ERROR:",
            learningError,
          );
        }
      }

      this.business.update(
        result,
      );
    }

    //
    // STEP 16
    // Return complete runtime context
    //
    return {
      customer,
      customerId:
        conversationCustomerId,
      databaseCustomerId,
      normalized,
      extracted,

      conversation:
        this.conversation.getOrCreate(
          conversationCustomerId,
        ),

      durableConversation:
        persistedConversation,

      previousConversation:
        durableConversation,

      workflow,
      goal,
      plan,
      decision,
      result,
      businessId,
      businessConfiguration,
    };
  }
}
