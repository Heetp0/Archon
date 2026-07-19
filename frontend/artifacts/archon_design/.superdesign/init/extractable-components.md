# Extractable Components

## NavRail
- Source: `src/components/NavRail.tsx`
- Category: layout
- Description: Global left sidebar rail with active mode highlights.
- Extractable props: activeMode (string, default: "chat"), onModeChange (function)

## ChatInput
- Source: `src/components/chat/ChatInput.tsx`
- Category: basic
- Description: Prompt input field with tools dropdown and attachments.
- Extractable props: value (string), onChange (function), onSubmit (function), model (string)

## RightSidebar
- Source: `src/components/RightSidebar.tsx`
- Category: layout
- Description: Slide-out right panel showing active tools, model parameters, and details.