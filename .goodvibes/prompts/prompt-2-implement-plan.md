<!--
<promptSpec>
    <goal>To instruct the AI editor to execute the first (or current) step of an implementation-plan-[feature-name].mdc.</goal>
    <usage>
        <scenario>Use within an AI-assisted editor (e.g., Cursor) when starting implementation of any plan, including those derived from a backlog item.</scenario>
        <tooling>AI-assisted coding editor.</tooling>
        <placeholders>
            <placeholder name="[feature-name]">The name of the feature corresponding to the plan.</placeholder>
            <placeholder name="[backlog-item-id]" optional="true">The ID of the backlog item from which this implementation plan was created (if applicable).</placeholder>
        </placeholders>
        <notes>Ensure the relevant implementation-plan-[feature-name].mdc is in .goodvibes/rules/. If a [backlog-item-id] is provided, the AI should also consult the original item in .goodvibes/rules/backlog.mdc for context. The AI will perform a 4-stage process for the step: Understand Validation -> Execute/Self-Correct -> Update Context (plan progress, core docs, potentially backlog status) -> Report.</notes>
    </usage>
    <nextSteps>
        <step>Thoroughly review the AI's code changes and its report for the executed step.</step>
        <step>Perform all manual validation checks defined for the step in the plan.</step>
        <step>If validation fails (despite AI self-correction), use prompt-3.5-continue-with-clarification.md. Do not proceed.</step>
        <step>If successful, and more steps remain, use prompt-3-continue-plan.md for the next step.</step>
        <step>If all steps of the plan are complete and it originated from a backlog item, ensure the backlog item status in .goodvibes/rules/backlog.mdc is updated as per the plan's final step instructions.</step>
    </nextSteps>
</promptSpec>
-->
Please implement the **current step** of the plan `.goodvibes/rules/implementation-plan-[feature-name].mdc`.

OPTIONAL: This implementation plan may correspond to backlog item ID: **[backlog-item-id]** found in `.goodvibes/rules/backlog.mdc`. If a `[backlog-item-id]` is provided above, please also review this original backlog item for intent and context.

As context review, `.goodvibes/rules/` using the workflow (`good-vibes.mdc`), rules (`rules.mdc`) and context documents (`architecture.mdc`, `tech-stack.mdc`, `design.mdc`).

**When in doubt about the step instructions, ask a clarifying question before writing code.**

Please follow these instructions:
*   Execute ONLY one step of the plan precisely as written at a time, including any test creation or modification specified within the step's actions.
*   Do not proceed to the next step without specific instructions.
*   Consider the risks and be careful to avoid them keeping the entire plan, key context (including the original backlog item, if provided), and step in mind as you implement the changes.
*   DO NOT make changes that were not outlined in this plan step.
*   If the implementation plan (particularly the final step or a dedicated step) specifies updating the status of a linked `[backlog-item-id]` in `.goodvibes/rules/backlog.mdc`, perform this update.

Follow these steps in order:
1.  **Understand Validation Criteria:** Thoroughly review the 'Validation' section of the current plan step. Ensure you know exactly what needs to be true for this step to be considered complete.
2.  **Execute Actions:**
    2.1.    Meticulously complete each action item listed in the plan for this step, in the exact order specified. Remember to follow Test-Driven Development (TDD) if the plan outlines test creation/modification before implementation. Use tests created in step 0 of the implementation plan.
    2.2.    Then, Run validation as defined in the plan step.
    2.3.    If validation succeeds, continue. If validation fails, critically analyze why. Consider each potential issue and fix and rank them by the most likely. Attempt up to 3 distinct, thoughtful corrections, rerunning validation after each attempt. You may use logging, which does not count as a distinct attempt, but ensure that debug logging is removed after the validation succeeds. If validation still fails, stop and prepare a detailed assessment of what went wrong, the attempts made, and why they were insufficient.
3.  **Update Context (within the step's scope)**
    3.1     Update any relevant context documents (e.g., `architecture.mdc`, `tech-stack.mdc`, `design.mdc`) as specified *in the current plan step*.
    3.2.    Update the 'Progress' section of the *current step* in the `implementation-plan-[feature-name].mdc` to 'Completed'.
    3.3.    If the current plan step explicitly directs an update to the `.goodvibes/rules/backlog.mdc` for the linked `[backlog-item-id]` (e.g., updating status after certain milestones or on completion), perform this update. *This is more likely to be part of the final step of the plan.*
4.  **Report & Review:** Provide a comprehensive report that includes:
    *   A detailed code review summary highlighting all key changes made and files affected.
    *   A clear explanation of how the user can manually validate that the step was completed successfully (if applicable, beyond automated tests).
    *   Confirmation that all tasks in this list (validation success, core document updates for this step, plan step progress marking, and any specified backlog updates) have been performed.

**Your thoughtful and precise execution of this step is critical. If this relates to a backlog item, remember it originated from a customer or stakeholder request. Let's focus on executing this step flawlessly. Proceed!**