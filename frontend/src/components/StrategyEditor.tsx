import React from 'react';
import Editor from '@monaco-editor/react';

interface StrategyEditorProps {
    code: string;
    onChange: (value: string | undefined) => void;
}

export const StrategyEditor: React.FC<StrategyEditorProps> = ({ code, onChange }) => {
    return (
        <div style={{ height: '400px', width: '100%', border: '1px solid var(--border)', borderRadius: '0', overflow: 'hidden' }}>
            <Editor
                height="100%"
                defaultLanguage="python"
                theme="vs-dark"
                value={code}
                onChange={onChange}
                options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                }}
            />
        </div>
    );
};
