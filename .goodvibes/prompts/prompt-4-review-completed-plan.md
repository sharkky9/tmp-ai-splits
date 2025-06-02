<!--
<promptSpec>
    <goal>To finalize a completed implementation plan: verify all steps, ensure core document consistency, confirm backlog update (if applicable), generate a final report in the plan, and archive it.</goal>
    <usage>
        <scenario>Use within an AI-assisted editor when all steps in an implementation-plan-[feature-name].mdc are marked 'Completed', including Step n: Clean Up and Testing (and Backlog Update, if applicable).</scenario>
        <tooling>AI-assisted coding editor.</tooling>
        <placeholders>
            <placeholder name="[feature-name]">The name of the feature corresponding to the completed plan.</placeholder>
            <placeholder name="[backlog-item-id]" optional="true">The ID of the backlog item this plan was for (if applicable). This is used to verify the backlog update.</placeholder>
        </placeholders>
        <notes>The AI will: 1. Verify plan completion, 2. Assess and update core documents, 3. Verify backlog item update (if [backlog-item-id] provided), 4. Append a final report to the plan, 5. Move the plan to .goodvibes/archive/.</notes>
    </usage>
    <nextSteps>
        <step>Review the final report appended to the plan (now in .goodvibes/archive/).</step>
        <step>Confirm that .goodvibes/rules/ core documents (architecture.mdc, design.mdc, tech-stack.mdc) are accurately updated.</step>
        <step>If applicable, confirm that the relevant item in .goodvibes/rules/backlog.mdc is correctly updated.</step>
        <step>The feature development cycle for this plan is now complete.</step>
    </nextSteps>
</promptSpec>
-->
**Excellent! We should now have completed `.goodvibes/rules/implementation-plan-[feature-name].mdc`. Let's wrap this up.**

(Optional) This plan may have originated from backlog item ID: **[backlog-item-id]**.

Remember to use the context documents (`architecture.mdc`, `tech-stack.mdc`, `design.mdc`), the plan itself (`.goodvibes/rules/implementation-plan-[feature-name].mdc`), and if a `[backlog-item-id]` is provided, also `.goodvibes/rules/backlog.mdc`.

Please perform the following final actions:

1.  **Verify Plan Completion:** Check `.goodvibes/rules/implementation-plan-[feature-name].mdc`; ensure ALL steps show 'Progress: Completed'. Where necessary update the plan to ensure everything matches what was accomplished.
2.  **Assess Core Documents:** Review `architecture.mdc`, `tech-stack.mdc`, `design.mdc`. Do they reflect all changes from the completed plan?
3.  **Update Core Documents (if needed):** Make necessary updates to `architecture.mdc`, `tech-stack.mdc`, `design.mdc` for full consistency with the implemented feature.
4.  **Verify Backlog Item Update (if `[backlog-item-id]` is provided):**
    a.  Open `.goodvibes/rules/backlog.mdc`.
    b.  Locate the item with **Item ID:** `[backlog-item-id]`.
    c.  Confirm its **Status:** is "Implemented" or "Closed" (or as appropriate, per the plan's final step instructions).
    d.  Confirm its **Implementation Plan Link:** correctly points to `.goodvibes/rules/implementation-plan-[feature-name].mdc` (which will soon be archived).
    e.  If any discrepancies are found, note them for the final report and, if straightforward, correct them in `backlog.mdc`.
5.  **Final Report:** Create a detailed report of the implementation and add it to the bottom of the implementation plan (`.goodvibes/rules/implementation-plan-[feature-name].mdc`):
    *   Confirmation that all plan steps in `.goodvibes/rules/implementation-plan-[feature-name].mdc` are marked 'Completed'. List any exceptions.
    *   Confirmation that core documents are now consistent. List any updates made in step 3, or state if no updates were needed.
    *   **(If `[backlog-item-id]` provided):** Confirmation that the backlog item `[backlog-item-id]` in `.goodvibes/rules/backlog.mdc` has been verified and is correctly updated (status and link). List any corrections made in step 4e.
    *   Any known issues or gaps. Suggestions for future work or ideas to refine the system or feature. i.e. What was not accomplished.
6.  **Archive Plan**: Move `.goodvibes/rules/implementation-plan-[feature-name].mdc` to `.goodvibes/archive/implementation-plan-[feature-name].mdc`

**Your thoroughness in this final report is key as it is the lasting mark of your work. Great job on reaching this point!**
