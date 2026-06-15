import sys
import re
from pathlib import Path

def main():
    if len(sys.argv) > 1:
        input_file = Path(sys.argv[1])
    else:
        rollout_files = sorted(Path(".").glob("rollout-*.md"))
        if rollout_files:
            input_file = rollout_files[0]
        else:
            raise FileNotFoundError(
                "No rollout-*.md file found. Pass an input file path to parser3.py."
            )

    if len(sys.argv) > 2:
        output_file = Path(sys.argv[2])
    else:
        output_file = input_file.with_name("chat-only-sanitized.md")
    
    with open(input_file, "r", encoding="utf-8") as f:
        content = f.read()

    lines = content.split('\n')
    
    out_lines = []
    current_block_type = None
    current_block_content = []
    current_header = ""
    
    def process_user_content(content_lines):
        filtered = []
        skip_mode = False
        
        for line in content_lines:
            if line.startswith('## Active file:') or \
               line.startswith('## Active selection of the file:') or \
               line.startswith('## Open tabs:'):
                skip_mode = True
                continue
            
            if skip_mode:
                if line.startswith('## My request for Codex:') or \
                   line.startswith('<turn_aborted>') or \
                   line.startswith('The following is an <EPHEMERAL_MESSAGE>'):
                    skip_mode = False
            
            if not skip_mode:
                filtered.append(line)
                
        # Remove IDE context headers
        final_filtered = []
        for l in filtered:
            s = l.strip()
            if s == '# Context from my IDE setup:' or s == '## My request for Codex:':
                continue
            final_filtered.append(l)
            
        return final_filtered

    def save_block():
        if current_block_type in ['User', 'Assistant']:
            if current_block_type == 'User':
                lines_to_save = process_user_content(current_block_content)
            else:
                lines_to_save = current_block_content
                
            body = '\n'.join(lines_to_save).strip()
            if current_block_type == 'Assistant' and len(body) > 500:
                body = body[:500] + "\n\n...[TRUNCATED]..."
                
            out_lines.append(f"{current_header}\n\n{body}\n")

    for line in lines:
        match = re.match(r'^## \[(#\d+)\] (User.*|Assistant)$', line)
        tool_match = re.match(r'^## \[(tool.*)\]', line)
        
        if match:
            save_block()
            current_header = line
            current_block_type = 'Assistant' if 'Assistant' in match.group(2) else 'User'
            current_block_content = []
        elif tool_match:
            save_block()
            current_block_type = 'Tool'
            current_block_content = []
        else:
            if current_block_type in ['User', 'Assistant']:
                current_block_content.append(line)
                
    save_block()
    
    with open(output_file, "w", encoding="utf-8") as f:
        f.write("\n".join(out_lines))
        
    print(f"Done: {input_file} -> {output_file}")

if __name__ == "__main__":
    main()
