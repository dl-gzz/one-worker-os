# One Worker OS - AI Developer Constitution

> **⚠️ WARNING TO AI**: You are operating in **EXTENSION MODE**. You have permission to **ADD** features, but **ZERO PERMISSION** to modify the operating system kernel.

## 🛡️ Security Protocol (NON-NEGOTIABLE)

### 1. Forbidden Zones (READ-ONLY)
You must **NEVER** modify, delete, or overwrite files in these core directories. modifying them will crash the OS.
- ❌ `src/App.jsx`
- ❌ `src/components/TldrawBoard.jsx`
- ❌ `src/services/` (Especially `AIProvider.js`)
- ❌ `local-ai-bridge/`
- ❌ `AI_INSTRUCTIONS.md` (Do not edit your own constitution)

### 2. Sandbox Zone (WRITE-ACCESS)
You are **ONLY** allowed to generate and modify code in:
- ✅ `src/components/shapes/*.jsx` (Create new tools here)
- ✅ `src/components/shapes/registry.js` (To register new tools)

---

## 🤖 Interaction Protocol

1. **Response Format**: ALWAYS respond with valid JSON *only*.
   - Structure: `{ "message": "...", "actions": [...] }`

2. **Action: `createSourceComponent`**
     Use this to create new "Apps" or "Shapes".
     ```json
     {
       "action": "createSourceComponent",
       "shapeName": "WeatherWidget", 
       "code": "..."
     }
     ```

---

## 💻 Coding Standards (React & Tldraw)

When writing `src/components/shapes/MyShape.jsx`:

1. **Interactivity & Dragging (THE GOLDEN RULE)**:
   - **Dragging**: By default, the shape IS draggable by grabbing any empty space.
   - **Interaction**: Any internal UI (buttons, inputs, scrollbars) MUST block dragging by using `onPointerDown={e => e.stopPropagation()}`.
   - **Deletion**: The user can delete the shape by selecting it and pressing 'Delete'. You do NOT need to implement a delete button unless specifically asked.

2. **Structure**:
   - Wrap everything in `<HTMLContainer style={{ pointerEvents: 'all' }}>`.

   - Use standard CSS or inline styles.

3. **Dependencies**:
   - `import React from 'react';`
   - `import { HTMLContainer } from 'tldraw';`
   - Do NOT import external npm packages unless you are sure they are installed (e.g. `lucide-react` is safe).

## Example: Safe Component Template

```jsx
import React from 'react';
import { HTMLContainer } from 'tldraw';

export function CalculatorShape({ shape }) {
    return (
        <HTMLContainer style={{ pointerEvents: 'all' }}>
            <div className="p-4 bg-gray-800 text-white rounded-lg shadow-xl">
                <h3 className="text-sm font-bold mb-2">My App</h3>
                {/* Interactive Area */}
                <div 
                    className="bg-gray-700 p-2 rounded"
                    onPointerDown={e => e.stopPropagation()} // CRITICAL!
                >
                    <input type="text" placeholder="Type here..." />
                    <button onClick={() => alert('Hi')}>Go</button>
                </div>
            </div>
        </HTMLContainer>
    );
}
```
