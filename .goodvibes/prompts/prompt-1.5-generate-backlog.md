<!--
<promptSpec>
    <goal>To quickly gather essential information and create a well-defined backlog item in .goodvibes/rules/backlog.mdc with minimal friction.</goal>
    <usage>
        <scenario>Use when a new issue, idea, or potential feature is identified that needs to be tracked but not immediately implemented.</scenario>
        <tooling>Intended for a frontier AI model (e.g., browser) with broad context access (e.g., RepoPrompt).</tooling>
        <placeholders>
            <placeholder name="[item-title]">A concise title for the backlog item.</placeholder>
            <placeholder name="[item-description]">A clear description of the problem/feature and why it matters.</placeholder>
            <placeholder name="[relevant-code-or-context]">Optional: Snippets of existing code, user feedback, or other relevant context.</placeholder>
        </placeholders>
        <notes>The AI should gather only essential information to create a useful backlog item. Focus on the problem/feature description and any key technical context. Auto-generate reasonable defaults for fields when possible to minimize user input required.</notes>
    </usage>
    <nextSteps>
        <step>Gather essential information with minimal questions.</step>
        <step>Generate and append the backlog item to .goodvibes/rules/backlog.mdc.</step>
        <step>Review the generated item for clarity and completeness.</step>
    </nextSteps>
</promptSpec>
-->
Request to Add to Backlog:
Title: [item-title]
Description: [item-description]

Relevant code or context (optional):
[relevant-code-or-context]

I'll help you quickly add this to the backlog. To create an effective backlog item, I need just a few key details:

**Essential Information:**
1. **What problem are we solving or what feature are we building?** 
   - Brief description of the current situation and what we want to achieve

2. **Any key technical context?** 
   - Existing code areas that might be affected
   - Technologies or approaches that should be considered
   - Dependencies or integration points

That's it! I'll auto-generate a unique ID, use today's date, and set reasonable defaults for other fields. You can always refine the backlog item later.

Once I have the essential information above, I'll create a properly formatted backlog entry and add it to `.goodvibes/rules/backlog.mdc` following this structure:

```markdown
---
**Item ID:** BKLOG-YYYYMMDD-NNN
**Title:** [Your Title]
**Date Added:** [Today's Date]
**Reported By:** [Auto-detected or "User"]
**Status:** Open
**Priority:** TBD
**Estimated Effort:** TBD
**Tags/Category:** [Inferred from Description]

**1. Problem Description / User Story / Business Need:**
   - [Clear description of what we're solving and why]

**2. Technical Context & Considerations:**
   - [Key technical details, affected code areas, dependencies]
   - [Any specific technologies or approaches to consider]

**3. Success Criteria (High-Level):**
   - [What "done" looks like - I'll infer reasonable criteria]

**4. Notes:**
   - [Any additional context provided]

**5. Implementation Plan Link (To be filled when work begins):**
   - Link: [TBD]
---
```

Ready to add your backlog item! Please provide the essential information above.
