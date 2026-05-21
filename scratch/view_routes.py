import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('backend/app/api/interviews.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

targets = [
    'def access_interview',
    'def get_current_question',
    'def complete_aptitude',
    'def end_interview',
    'def get_interview_stage',
]

for target in targets:
    for idx, line in enumerate(lines):
        if target in line:
            print(f'\n{"="*60}')
            print(f'FOUND: {target} at line {idx+1}')
            print(f'{"="*60}')
            for j in range(idx, min(len(lines), idx+80)):
                print(f'{j+1}: {lines[j].rstrip()}')
            break
