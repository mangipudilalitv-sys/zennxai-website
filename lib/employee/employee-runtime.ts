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

import { ConversationStateEngine } from "./conversation-state";
import { GoalEngine } from "./goal-engine";
import { WorkflowEngine } from "./workflow-engine";
import { PlanningEngine } from "./planning-engine";
import { LearningEngine } from "./learning-engine";
import { BusinessBrain } from "./business-brain";

import { CustomerService } from "@/lib/services/customer-service";
import { BusinessConfigurationService } from "@/lib/services/business-configuration-service";

export class EmployeeRuntime {
  private readonly understanding =
    new EmployeeUnderstanding();

  private readonly extractor =
    new InformationExtractor();

  private readonly customers =
    new CustomerService();

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

  private readonly business =
    new BusinessBrain();

  private readonly businessConfiguration =
    new BusinessConfigurationService();

  /**
   * Keeps the real Supabase customer UUID associated
   * with the stable conversation/customer session ID.
   *
   * Example:
   * customer_001 -> 21810206-8687-...
   */
  private readonly persistedCustomerIds =
    new Map<string, string>();

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
    // Establish stable conversation identity
    //
    // This ID must NEVER change between turns.
    //
    const conversationCustomerId =
      normalized.customerId ??
      "anonymous";

    //
    // STEP 4
    // Resolve business
    //
    const businessId =
      (event as { businessId?: string }).businessId ??
      process.env.DEFAULT_BUSINESS_ID;

    //
    // STEP 5
    // Load tenant-specific business configuration.
    //
    // ZennX remains one universal employee engine.
    // Each business controls its own behavior,
    // capabilities, policies and autonomy.
    //
    const businessConfiguration =
      businessId
        ? await this.businessConfiguration.getOrCreate(
            businessId,
          )
        : null;

    //
    // STEP 6
    // Resolve/persist real database customer
    //
    let customer = null;

    if (businessId) {
      customer =
        await this.customers.getOrCreate({
          businessId,
          phone: extracted.phone,
          name: extracted.name,
        });

      if (customer?.id) {
        this.persistedCustomerIds.set(
          conversationCustomerId,
          customer.id,
        );
      }
    }

    const databaseCustomerId =
      customer?.id ??
      this.persistedCustomerIds.get(
        conversationCustomerId,
      );

    //
    // STEP 6
    // Workflow
    //
    // Always use stable conversation identity here.
    //
    const workflow =
      this.workflow.update(
        conversationCustomerId,
        extracted,
      );

    //
    // STEP 7
    // Conversation
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
    // STEP 8
    // Goal
    //
    const goal =
      this.goals.getActiveGoal(
        conversationCustomerId,
      );

    //
    // STEP 9
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
    // STEP 10
    // Decision
    //
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
      });

    //
    // STEP 11
    // Execute plan
    //
    let result: EmployeeActionResult | null =
      null;

    for (const step of plan.steps) {
      //
      // Conversation/qualification actions use the
      // stable session identity.
      //
      // Database-backed appointment creation requires
      // the real Supabase customer UUID.
      //
      const requiresDatabaseCustomer =
        step.action === "BOOK_APPOINTMENT" ||
        step.action === "FOLLOW_UP";

      const actionCustomerId =
        requiresDatabaseCustomer
          ? databaseCustomerId ??
            conversationCustomerId
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
              reason: "Business could not be resolved.",
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
      } else if (permission.requiresApproval) {
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
            },
          );
      }

      if (
        result === null ||
        step.action === decision.action
      ) {
        result = stepResult;
      }

      this.planner.completeStep(
        conversationCustomerId,
        step.id,
      );
    }

    //
    // STEP 12
    // Update conversation with employee action
    //
    if (result) {
      this.conversation.setEmployeeAction(
        conversationCustomerId,
        result.action,
      );
    }

    //
    // STEP 13
    // Learning + Business Intelligence
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

      this.business.update(
        result,
      );
    }

    //
    // STEP 14
    // Return runtime context
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