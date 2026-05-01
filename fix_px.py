import os
import re

def convert_px_to_clamp_text(match):
    px_val = int(match.group(1))
    min_rem = round((px_val * 0.8) / 16, 4)
    pref_vw = round(px_val / 10, 2)
    max_rem = round(px_val / 16, 4)
    return f"text-[clamp({min_rem}rem,{pref_vw}vw,{max_rem}rem)]"

def convert_px_to_rem(match):
    prefix = match.group(1)
    px_val = int(match.group(2))
    rem_val = round(px_val / 16, 4)
    if px_val >= 44 and prefix in ['w', 'h', 'min-w', 'min-h', 'max-w', 'max-h']:
        min_rem = round((px_val * 0.8) / 16, 4)
        pref_vw = round(px_val / 10, 2)
        return f"{prefix}-[clamp({min_rem}rem,{pref_vw}vw,{rem_val}rem)]"
    return f"{prefix}-[{rem_val}rem]"

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Replace text-[Xpx]
    content = re.sub(r'text-\[(\d+)px\]', convert_px_to_clamp_text, content)
    
    # Replace other properties like w-[Xpx], h-[Xpx], rounded-[Xpx], gap-[Xpx], top-[Xpx]
    content = re.sub(r'([a-zA-Z0-9-]+)-\[(\d+)px\]', convert_px_to_rem, content)

    # Convert arbitrary strings like "32px" left in inline styles or other places?
    # Probably safer to only do classnames as above.
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

for root, _, files in os.walk('frontend/src'):
    for file in files:
        if file.endswith(('.tsx', '.ts', '.jsx', '.js', '.css')):
            process_file(os.path.join(root, file))

print("Conversion complete.")
