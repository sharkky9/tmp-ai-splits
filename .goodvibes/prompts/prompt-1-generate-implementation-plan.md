<!--
<promptSpec>
    <goal>To create a detailed, step-by-step implementation-plan-[feature-name].mdc for a new feature through an iterative two-phase process: (1) thorough requirements gathering via comprehensive questions, and (2) implementation plan generation.</goal>
    <usage>
        <scenario>Use at the start of a new feature, or when creating an implementation plan for an item from .goodvibes/rules/backlog.mdc.</scenario>
        <tooling>Intended for a frontier AI model (e.g., browser) with broad context access (e.g., RepoPrompt).</tooling>
        <placeholders>
            <placeholder name="[feature-name]">The specific name for the feature (used in the output filename).</placeholder>
            <placeholder name="[feature-description]">A clear and detailed description of the feature. If from a backlog item, include its details here.</placeholder>
            <placeholder name="[relevant-code]">Snippets of existing code relevant to the new feature.</placeholder>
            <placeholder name="[backlog-item-id]" optional="true">The ID of the backlog item this plan is for (if applicable). This helps in linking and updating the backlog item.</placeholder>
        </placeholders>
        <notes>The AI is instructed to use existing .goodvibes/rules/ documents (architecture.mdc, design.mdc, tech-stack.mdc, rules.mdc, backlog.mdc) and style guides for context. The output plan should be saved to .goodvibes/rules/implementation-plan-[feature-name].mdc. If a [backlog-item-id] is provided, the generated plan should include actions in its final step(s) to update the status of this item in .goodvibes/rules/backlog.mdc and to ensure the implementation plan link is correctly recorded in the backlog item.</notes>
    </usage>
    <nextSteps>
        <step>Engage in the iterative questioning process to ensure all aspects of the feature are well understood.</step>
        <step>Review the generated .goodvibes/rules/implementation-plan-[feature-name].mdc.</step>
        <step>Check for: clarity, logical flow, atomic steps, TDD, inclusion of Step 0 (Test Scaffold) and Step n (Clean Up, Testing, and Backlog Update if applicable), validation criteria, risk assessment, and core document update identification.</step>
        <step>Manually refine the plan as needed before starting implementation.</step>
    </nextSteps>
</promptSpec>
-->
Feature Request:
Name: [feature-name]
Description: [feature-description]
Relevant code or context: [relevant-code]
(Optional) Corresponding Backlog Item ID: [backlog-item-id]

To create an effective implementation plan, you need to understand this feature from both user and technical perspectives. Ask the following questions (and any follow-ups needed):

User & Functional Perspective:
- What specific user problem does this feature solve?
- How will users interact with this feature and what are the key workflows?
- What are the core capabilities and expected inputs/outputs?
- Are there any specific edge cases or error conditions to handle?

Technical Implementation:
- How does this feature fit into the existing architecture?
- Which existing components will be affected and how?
- What new components, if any, need to be created?
- Will this require changes to data models, APIs, or interfaces?
- Does this feature align with patterns in our architecture.mdc?
- Are there any new libraries, tools, or technologies needed?

Boundaries & Constraints:
- What is explicitly out of scope for this feature?
- Are there any technical limitations or constraints to work within?
- What existing functionality should remain unchanged?
- Are there dependencies on other features or systems?
- Are there any performance or security considerations?

Ask clarifying follow-up questions until you have a complete understanding of the feature and there are no gaps in your knowledge. Continue this iterative questioning process until you feel confident in your ability to produce a comprehensive implementation plan.

Once you have sufficient information, create a detailed implementation plan that:

- Will be saved as `.goodvibes/rules/implementation-plan-[feature-name].mdc` following the structure in `.goodvibes/rules/good-vibes.md`.
- Includes a "Relevant Files" section listing all files to be created or modified with brief descriptions.
- Defines clear "Success Metrics" based on the gathered information.
- Breaks down the implementation into small, atomic steps that can be independently implemented and validated.

Each step should include:
- Goal: Clear objective for the step
- Actions: List of actions, with test creation/modification (TDD) always preceding implementation
- Validation Criteria: Explicit criteria to confirm the step is complete
- Risks: Potential failure paths and how validation addresses them
- Core Document Updates: Which core documents provide context and which may require updates
- Progress Marker: `Progress: Not Started` (to be updated as steps are completed)

The plan should begin with "Step 0: Test Scaffold" and end with "Step n: Clean Up and Testing".

**If a `[backlog-item-id]` was provided in the request, ensure the "Step n: Clean Up and Testing" (or a dedicated final step) includes specific actions to:**
1.  **Update the status of `[backlog-item-id]` in `.goodvibes/rules/backlog.mdc`** (e.g., to "Implemented" or "Closed").
2.  **Verify/add the link to this implementation plan (`.goodvibes/rules/implementation-plan-[feature-name].mdc`) within the specified `[backlog-item-id]` entry in `.goodvibes/rules/backlog.mdc`.**

Use the following format as a guide, paying attention to the modified "Step n" if a backlog item is involved:

```markdown
---
description: Example Implementation Plan for Feature Z
globs: 
alwaysApply: false
---

# Implementation Plan: Feature Z

**Goal:** [Overall goal of this plan, e.g., To implement a new service for processing Z-type data and exposing it via an API endpoint.]

**(If applicable) Related Backlog Item ID:** [backlog-item-id]

## Implementation Context

### User & Functional Perspective
- **Problem Solved:** Feature Z allows users to process and visualize Z-type data, addressing the need for [specific user problem].
- **Key Workflows:** Users will upload Z data, configure processing parameters, and view results in an interactive dashboard.
- **Core Capabilities:** Data validation, processing pipeline, visualization, and export functionality.

### Technical Implementation
- **Architecture Fit:** Integrates with existing data processing pipeline as a new service module.
- **Affected Components:** Will enhance the existing upload service and dashboard components.
- **Data Model Changes:** Requires new Z-data schema and processing result storage.

### Boundaries & Constraints
- **Out of Scope:** Real-time processing of Z data and integration with external systems.
- **Limitations:** Initial version limited to processing files under 100MB.
- **Unchanged Functionality:** Existing data export formats and user authentication flow.

## Relevant Files

- `src/services/feature_z_service.py` - **NEW** - Core service implementing Feature Z functionality
- `src/services/feature_z_service_test.py` - **NEW** - Unit tests for Feature Z service
# ... other files ...

## Core Documents Affected

- `architecture.mdc` - Add Feature Z service in the data processing section (Step 1)
- `design.mdc` - Add new user flows for Feature Z (Step 4)
- `tech-stack.mdc` - Add new visualization library dependencies (Step 2)

## Success Metrics
- Processing time for Z-data files under 5 seconds for files up to 50MB
- UI response time under 200ms when interacting with visualization
- 95% test coverage for new components

## Step 0: Test Scaffolding
*   **Goal:** Enumerate all behavioral specifications for Feature Z as initially failing test stubs.
*   **Actions:**
    1.  **Test Stubs:** For each requirement of Feature Z, create a corresponding failing unit test stub in `tests/features/test_featureZ_service.py`.
*   **Validation:** All created test stubs for Feature Z are present and failing.
*   **Risks:** Incomplete requirements leading to incomplete test stubs.
*   **Core Document Updates:** None for this step.
*   **Progress:** Not Started

## Step 1: Setup Feature Z Module
*   **Goal:** Create the basic file structure and initial class/component for Feature Z.
*   **Actions:** Create directory, init files, basic class `FeatureZService`.
    1. Create `src/features/featureZ/featureZ_service.py` etc.
    2. **Test:** Instantiate `FeatureZService` successfully.
*   **Validation:** Directory structure and files exist; instantiation test passes.
*   **Risks:** Naming conflicts; unclear interface.
*   **Core Document Updates:** `architecture.mdc` (add new module description).
*   **Progress:** Not Started

# ... subsequent steps ...

## Step n: Cleanup, Testing, and Backlog Update (if applicable)
*   **Goal:** Ensure the feature's codebase is pristine, all tests pass, core documents are updated, and if this plan is for a backlog item, that item is correctly updated in `.goodvibes/rules/backlog.mdc`.
*   **Actions:**
    1.  **Code Review & Refinement:** Conduct a thorough review of all code implemented for the feature.
    2.  **Remove Temporary Artifacts:** Delete all temporary logging, debug flags, etc.
    3.  **Resolve Minor Issues:** Address any minor outstanding TODOs or FIXMEs.
    4.  **Adherence to Standards & Consistency Review:** Verify against `tech-stack.mdc`, style guides. Ensure clear comments, consistent naming.
    5.  **Comprehensive Test Execution:** Run all feature-related tests.
    6.  **Address Test Failures (if any):** Diagnose and correct.
    7.  **(If plan is for a backlog item [backlog-item-id]):**
        a.  **Edit `.goodvibes/rules/backlog.mdc`:**
            i.  Locate the item with **Item ID:** `[backlog-item-id]`.
            ii. Update its **Status:** field to "Implemented" (or "Closed", as appropriate).
            iii.Ensure the **Implementation Plan Link:** field correctly points to this file (e.g., `.goodvibes/rules/implementation-plan-[feature-name].mdc`). Add or verify it.
        b.  **Confirm Backlog Update:** Briefly note that the backlog item `[backlog-item-id]` has been updated.
*   **Validation:**
    *   No temporary code remains.
    *   Code adheres to all guidelines.
    *   All tests pass.
    *   Feature functions as expected.
    *   **(If applicable):** The specified `[backlog-item-id]` in `.goodvibes/rules/backlog.mdc` shows Status: Implemented (or Closed) and has the correct link to this implementation plan.
*   **Risks:** Overlooking temporary code; regressions during cleanup; backlog item not found or incorrectly updated.
*   **Core Document Updates:** `tech-stack.mdc` (if any temporary tools removed). Final check of `architecture.mdc`, `design.mdc` for consistency.
*   **Progress:** Not Started