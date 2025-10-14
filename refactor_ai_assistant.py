#!/usr/bin/env python3
"""
Refactor AI Assistant V2 to use RunContext for proper context management.
This script transforms function signatures from:
  async function foo(supabase: any, wheelId: string, args: Args)
To:
  async function foo(ctx: RunContext<WheelContext>, args: Args)

And updates all tool execute functions accordingly.
"""

import re

def refactor_file(input_path, output_path):
    with open(input_path, 'r') as f:
        content = f.read()
    
    # Add lastSuggestions to WheelContext
    content = content.replace(
        'interface WheelContext {\n  supabase: any\n  wheelId: string\n  userId: string\n  currentYear: number\n}',
        '''interface WheelContext {
  supabase: any
  wheelId: string
  userId: string
  currentYear: number
  lastSuggestions?: Array<{
    name: string
    startDate: string
    endDate: string
    ring: string
    group: string
  }>
}'''
    )
    
    # Pattern 1: Functions with (supabase: any, wheelId: string, args: ...)
    pattern1 = r'async function (\w+)\(\s*supabase: any,\s*wheelId: string,\s*args: ([^\)]+)\)'
    replacement1 = r'async function \1(\n  ctx: RunContext<WheelContext>,\n  args: \2)'
    content = re.sub(pattern1, replacement1, content)
    
    # Pattern 2: Functions with just (supabase: any, wheelId: string, someName: type)
    pattern2 = r'async function (\w+)\(supabase: any, wheelId: string, (\w+: \w+)\)'
    replacement2 = r'async function \1(ctx: RunContext<WheelContext>, \2)'
    content = re.sub(pattern2, replacement2, content)
    
    # Pattern 3: Functions with just (supabase: any, wheelId: string)
    pattern3 = r'async function (\w+)\(supabase: any, wheelId: string\)'
    replacement3 = r'async function \1(ctx: RunContext<WheelContext>)'
    content = re.sub(pattern3, replacement3, content)
    
    # Add destructuring at start of each refactored function
    # Find all function bodies and add const { supabase, wheelId } = ctx.context
    def add_destructuring(match):
        func_name = match.group(1)
        func_body = match.group(2)
        
        # Skip if already has destructuring
        if 'const { supabase, wheelId } = ctx.context' in func_body:
            return match.group(0)
        
        # Add destructuring after opening brace
        lines = func_body.split('\n')
        if len(lines) > 1:
            # Insert after first line (opening brace)
            lines.insert(1, '  const { supabase, wheelId } = ctx.context')
            new_body = '\n'.join(lines)
            return f'async function {func_name}(ctx: RunContext<WheelContext>, args){new_body}'
        return match.group(0)
    
    # Update tool execute functions - remove supabase, wheelId from destructuring
    # OLD: execute: async (input, { supabase, wheelId }) =>
    # NEW: execute: async (input, ctx: RunContext<WheelContext>) =>
    content = re.sub(
        r'execute: async \((\w+), \{ supabase, wheelId \}\)',
        r'execute: async (\1, ctx: RunContext<WheelContext>)',
        content
    )
    
    # Update function calls - remove supabase, wheelId parameters
    # OLD: await createActivity(supabase, wheelId, input)
    # NEW: await createActivity(ctx, input)
    function_names = [
        'createActivity', 'createRing', 'createGroup', 'createLabel',
        'updateActivity', 'updateRing', 'updateGroup', 'updateLabel',
        'deleteActivity', 'deleteRing', 'deleteGroup', 'deleteLabel',
        'getCurrentRingsAndGroups', 'getCurrentDate'
    ]
    
    for func_name in function_names:
        # Pattern: funcName(supabase, wheelId, otherArgs)
        content = re.sub(
            rf'{func_name}\(supabase, wheelId, ([^)]+)\)',
            rf'{func_name}(ctx, \1)',
            content
        )
        # Pattern: funcName(supabase, wheelId)
        content = re.sub(
            rf'{func_name}\(supabase, wheelId\)',
            rf'{func_name}(ctx)',
            content
        )
    
    # Type all agents with WheelContext
    content = re.sub(
        r'const (\w+Agent) = new Agent\({',
        r'const \1 = new Agent<WheelContext>({',
        content
    )
    content = re.sub(
        r'const (\w+Agent) = Agent\.create\({',
        r'const \1 = Agent.create<WheelContext>({',
        content
    )
    
    with open(output_path, 'w') as f:
        f.write(content)
    
    print(f"Refactored {input_path} -> {output_path}")
    print("Next steps:")
    print("1. Add const { supabase, wheelId } = ctx.context to each function body")
    print("2. Review and test the output")

if __name__ == '__main__':
    import sys
    input_file = 'supabase/functions/ai-assistant-v2/index.ts.backup'
    output_file = 'supabase/functions/ai-assistant-v2/index-refactored.ts'
    refactor_file(input_file, output_file)
