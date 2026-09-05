import assert from "node:assert/strict";
import {
  PlanningEngine,
} from "../lib/employee/planning-engine";

const customerId =
  "planning-test-customer";

const planner =
  new PlanningEngine();

const plan =
  planner.createPlan(
    customerId,
    {
      nextObjective:
        "BOOK_APPOINTMENT",
      stage:
        "READY_TO_BOOK",
    },
  );

const booking =
  plan.steps[0];

const confirmation =
  plan.steps[1];

const followUp =
  plan.steps[2];

assert.equal(
  planner.dependenciesCompleted(
    customerId,
    booking.id,
  ),
  true,
);

assert.equal(
  planner.dependenciesCompleted(
    customerId,
    confirmation.id,
  ),
  false,
);

assert.equal(
  planner.dependenciesCompleted(
    customerId,
    followUp.id,
  ),
  false,
);

planner.failStep(
  customerId,
  booking.id,
);

assert.equal(
  booking.status,
  "failed",
);

planner.blockStep(
  customerId,
  confirmation.id,
);

planner.blockStep(
  customerId,
  followUp.id,
);

assert.equal(
  confirmation.status,
  "blocked",
);

assert.equal(
  followUp.status,
  "blocked",
);

const successCustomerId =
  "planning-success-customer";

const successPlan =
  planner.createPlan(
    successCustomerId,
    {
      nextObjective:
        "BOOK_APPOINTMENT",
      stage:
        "READY_TO_BOOK",
    },
  );

planner.completeStep(
  successCustomerId,
  successPlan.steps[0].id,
);

assert.equal(
  planner.dependenciesCompleted(
    successCustomerId,
    successPlan.steps[1].id,
  ),
  true,
);

assert.equal(
  planner.dependenciesCompleted(
    successCustomerId,
    successPlan.steps[2].id,
  ),
  true,
);

console.log(
  "PLANNING DEPENDENCY TEST PASSED",
);
