Generate a spec file for a component using requirements and the workshop template.

## Instructions

1. Parse the component name from: $ARGUMENTS
   - Convert to kebab-case for filenames (e.g., "CustomerCard" → "customer-card")
   - Preserve PascalCase for the display name in the spec content

2. Check for a requirements file at: `requirements/[kebab-name].md`
   - If found, read it and use it as the primary source of truth for the spec
   - If not found, proceed using only the component name and infer reasonable details

3. Read the template at: @templates/spec-template.md

4. Generate a complete spec following the template structure with these four sections:

   ### Context
   - Purpose and role of the component in the application
   - How it fits into the larger system architecture
   - Who will use it and when

   ### Requirements
   - Functional requirements (what it must do)
   - User interface requirements
   - Data requirements
   - Integration requirements

   ### Constraints
   - Technical stack: Next.js 15, React 19, TypeScript, Tailwind CSS
   - Performance requirements (load times, rendering thresholds)
   - Design constraints (responsive breakpoints, component size limits)
   - File structure and naming conventions
   - Props interface and TypeScript definitions
   - Security considerations

   ### Acceptance Criteria
   - Testable success criteria as unchecked checkboxes `- [ ]`
   - Edge cases to handle
   - User experience validations
   - Integration points to verify

5. Save the generated spec to: `specs/[kebab-name]-spec.md`

6. Confirm the file was saved and show the output path.
