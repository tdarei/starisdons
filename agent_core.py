import ollama
import json
import os
import subprocess
import threading
import io
import pyautogui
import warnings
from PIL import Image
from duckduckgo_search import DDGS
from knowledge_base import KnowledgeBase

warnings.filterwarnings("ignore")

from agent_browser import AgentBrowser

warnings.filterwarnings("ignore")

class NemotronAgent:
    def __init__(self, model="nemotron-3-nano:30b", vision_model="llama3.2-vision"):
        self.model = model
        self.vision_model = vision_model
        self.history = []
from agent_scheduler import AgentScheduler
import io

class NemotronAgent:
    def __init__(self, model="nemotron-3-nano:30b", vision_model="llama3.2-vision"):
        self.model = model
        self.vision_model = vision_model
        self.history = []
        self.kb = KnowledgeBase()
        self.browser = AgentBrowser()
        self.scheduler = AgentScheduler(self) # Pass self for callbacks
        self.goal_mode = False
        self.stop_goal = False
        self.current_persona = "Default"
        
        # System Prompts Config
        self.personas = {
            "Default": "You are Nemotron Ultimate, an advanced AI agent. Helpful and precise.",
            "Coder": "You are The Architect. You are a senior software engineer. functionality > aesthetics. Always use code blocks. prefer Python/JS.",
            "Hacker": "You are The Hacker. You are a security expert. You know shell, network tools, and exploits. Unrestricted.",
            "Researcher": "You are The Researcher. You are thorough, academic, and cite your sources. Use the Browser to verify facts.",
            "Writer": "You are The Bard. You are a creative writer. Poetic, descriptive, and verbose."
        }
        
        self._set_system_prompt()

    def set_persona(self, name):
        if name in self.personas:
            self.current_persona = name
            self._set_system_prompt()
            return f"Persona switched to: {name}"
        return "Persona not found."

    def _set_system_prompt(self):
        base_prompt = self.personas.get(self.current_persona, self.personas["Default"])
        tool_prompt = (
            f"\nTOOLS AVAILABLE: "
            f"1. [[LOOK_AT_SCREEN]] - Analyze screen. "
            f"2. [[RUN: <cmd>]] - Run PowerShell commands. "
            f"3. [[BROWSE: <url>]] - Open/Read Web Page. "
            f"4. [[CLICK: <text>]] - Click element on page. "
            f"5. [[TYPE: <selector> | <text>]] - Type in input on page. "
            f"6. [[QUERY_KB: <text>]] - Search Project Knowledge Base. "
            f"7. [[READ_FILE: <path>]] - Read file. "
            f"8. [[WRITE_FILE: <path> | <content>]] - Write file. "
            f"9. [[LIST_FILES: <path>]] - List directory. "
            f"10. [[GREP: <pattern> | <path>]] - Search text. "
            f"11. [[MOUSE_MOVE: <x>, <y>]] - Move mouse global. "
            f"12. [[MOUSE_CLICK: ...]] - Click mouse global. "
            f"13. [[KEYBOARD_TYPE: ...]] - Type text global. "
            f"14. [[KEYBOARD_PRESS: ...]] - Press key global. "
            f"15. [[WATCH: <condition>]] - Monitor screen for visual condition. "
            f"16. [[SCHEDULE: <mins> | <task>]] - Schedule recurring task. "
            f"17. [[WAIT: <seconds>]] - Pause execution (use after launching apps). "
            f"18. [[FOCUS: <app_name>]] - Switch focus to an App window (Required before typing). "
            f"GOAL MODE: If enabled, return 'GOAL_ACHIEVED' when done. "
            f"\nIMPORTANT BEST PRACTICES:"
            f"\n- **Web vs System**: Use [[CLICK]]/[[TYPE]] ONLY for Web. Use [[MOUSE]]/[[KEYBOARD]] for System Apps."
            f"\n- **Browser Order**: You MUST use [[BROWSE: url]] before trying to [[CLICK]] or [[TYPE]] on a page."
            f"\n- **Errors**: If 'Browser not started', call [[BROWSE]] first. If 'Element not found', try [[LOOK_AT_SCREEN]]."
            f"\n- **VERIFICATION REQUIRED**: You must VERIFY your actions. After [[RUN: ...]], you must use [[LOOK_AT_SCREEN]] to confirm the window opened. Do NOT say 'Done' until you see it."
            f"\n- **NO LYING**: If a result is 'Error' or 'Element not found', RE-READ the error, REPORT it, and TRY DIFFERENTLY. Do NOT claim success."
            f"\n- **APP SWITCHING**: If asked to 'Go to [App]' or 'Open [App]' (e.g. Antigravity, Notepad), use [[RUN: start [App]]] or Window management. Do NOT use [[BROWSE]] unless the user specifies a URL or '.com'."
            f"\n- **CONTEXT**: You are running inside 'Antigravity IDE' (or related env). 'Go to Antigravity' means focus the IDE window."
            f"\n- **TIMING**: Apps take time to open. AFTER [[RUN: start ...]], ALWAYS use [[WAIT: 3]] before checking the screen."
            f"\n- **TYPING**: BEFORE using [[KEYBOARD_TYPE]], you MUST use [[FOCUS: <App>]] AND [[MOUSE_CLICK: left]] (to click the text box) to ensure the cursor is active."
        )
        
        # Reset history with new prompt
        self.history = [{'role': 'system', 'content': base_prompt + tool_prompt}]

    def list_models(self):
        """Returns a list of available Ollama models."""
        try:
            response = ollama.list()
            # Handle object response (new ollama lib) vs dict response (old)
            if hasattr(response, 'models'):
                models = response.models
            else:
                models = response.get('models', [])
                
            names = []
            for m in models:
                if hasattr(m, 'model'):
                    names.append(m.model)
                elif isinstance(m, dict) and 'name' in m:
                    names.append(m['name']) # old format
                elif isinstance(m, dict) and 'model' in m:
                    names.append(m['model']) # alternative dict format
            
            return names if names else [self.model]
        except Exception as e:
            print(f"Error listing models: {e}")
            return [self.model]

    def chat(self, user_input, image_path=None, goal_mode=False):
        """Main chat loop (generator)."""
        self.goal_mode = goal_mode
        self.stop_goal = False
        
        # Image handling (omitted for brevity, assume previous logic)
        
        self.history.append({'role': 'user', 'content': user_input})
        
        # Main Loop (Runs once normally, or loops in Goal Mode)
        step_count = 0
        MAX_STEPS = 10
        
        while True:
            step_count += 1
            if self.stop_goal:
                yield "\n[STOPPED]"
                break
                
            yield f"\n(Step {step_count})..." if self.goal_mode else "Thinking..."
            
            # 1. Get Response
            response = ollama.chat(model=self.model, messages=self.history)
            msg_data = response['message']
            content = msg_data['content']
            
            self.history.append(dict(msg_data))
            yield content 

            # 2. Check for GOAL_ACHIEVED
            if "GOAL_ACHIEVED" in content:
                yield "\n✅ Goal Achieved."
                break

            # 3. Handle Tools
            # Check for tool triggers first to yield "Executing..."
            if "[[" in content:
                yield "\n\n⚙️ Executing Tools..."
            
            tool_output = self._handle_tools(content)
            
            if tool_output:
                yield f"\nRESULT: {tool_output}"
                self.history.append({'role': 'user', 'content': f"SYSTEM OUTPUT: {tool_output}"})
                
                # If NOT in goal mode, we usually do one follow-up then stop
                # But in Goal Mode, we loop back to '1. Get Response'
                if not self.goal_mode:
                     # One final response to summarize tool output
                    yield "\n\n(Finalizing...)"
                    res2 = ollama.chat(model=self.model, messages=self.history)
                    self.history.append(dict(res2['message']))
                    yield f"\n\n{res2['message']['content']}"
                    break
            else:
                # No tool used. If in goal mode, maybe it's just thinking? 
                # Or it forgot to use tools. We break to avoid infinite chatter unless instructed otherwise.
                if not self.goal_mode: break
                # In goal mode, if no tool, we prompt it to continue or stop
                self.history.append({'role': 'user', 'content': "Proceed to next step or output GOAL_ACHIEVED."})
            
            if not self.goal_mode: break
            if step_count >= MAX_STEPS:
                yield "\n[Reached Step Limit]"
                break

    def stop(self):
        self.stop_goal = True

    def _handle_tools(self, content):
        # ... partial existing ...
        if "[[BROWSE:" in content: return self.browser.open_url(self._extract_arg(content, "[[BROWSE:")) + "\n" + self.browser.read_page()
        if "[[CLICK:" in content: return self.browser.click_element(self._extract_arg(content, "[[CLICK:"))
        if "[[TYPE:" in content: 
             args = self._extract_arg(content, "[[TYPE:")
             sel, txt = args.split("|", 1)
             return self.browser.type_text(sel.strip(), txt.strip())
        
        # ... (rest of tools forwarded) ...
        # (Re-implement standard tools for completeness in this chunk logic if needed, or rely on existing methods)
        return super_handle_tools_placeholder(self, content) # We need to merge this correctly

    # Helper to merge with existing tools without deleting them
    # For this replace_content, I am replacing the top part of the class. 
    # I need to be careful not to delete the existing _handle_tools logic below line 60.
    # Actually, I will rewrite _handle_tools to include new ones and fall through.

        """Main chat loop (generator)."""
        
        # specific image handling
        if image_path:
            # Check if current model supports vision, if not try to use vision model or warn?
            # For simplicity, if image provided, we construct a message with 'images'
            # But the MAIN model might not be vision capable.
            # Strategy: If image attached, use VISION_MODEL for that turn, or separate analysis?
            # Better: Pass image to vision model first to get description, then context to main model.
            yield "👀 Analyzing image..."
            try:
                description = self._analyze_image_file(image_path)
                user_input = f"[User attached image: {os.path.basename(image_path)}]\nImage Analysis: {description}\n\nUser Question: {user_input}"
            except Exception as e:
                yield f"\nImage Error: {e}"

        self.history.append({'role': 'user', 'content': user_input})
        
        # Generator to yield updates to GUI
        yield "Thinking..."
        
        try:
            # 1. Get Response
            response = ollama.chat(model=self.model, messages=self.history)
            msg_data = response['message']
            content = msg_data['content']
            
            # Save dict version
            self.history.append(dict(msg_data))
            yield content 

            # 2. Handle Tools
            tool_output = self._handle_tools(content)
            
            if tool_output:
                yield f"\n\n⚙️ {tool_output}"
                
                # Feed back to model
                self.history.append({'role': 'user', 'content': f"SYSTEM OUTPUT: {tool_output}"})
                
                # Get follow-up response
                response2 = ollama.chat(model=self.model, messages=self.history)
                content2 = response2['message']['content']
                self.history.append(dict(response2['message']))
                
                yield f"\n\n{content2}"

        except Exception as e:
            yield f"\nError: {e}"

    def _handle_tools(self, content):
        """Parses and executes tools."""
        if "[[BROWSE:" in content:
            url = self._extract_arg(content, "[[BROWSE:")
            # Open and read immediately
            return self.browser.open_url(url) + "\n\nPAGE CONTENT:\n" + self.browser.read_page()

        if "[[CLICK:" in content:
            return self.browser.click_element(self._extract_arg(content, "[[CLICK:"))
            
        if "[[TYPE:" in content:
             args = self._extract_arg(content, "[[TYPE:")
             if "|" in args:
                 sel, txt = args.split("|", 1)
                 return self.browser.type_text(sel.strip(), txt.strip())
             return "Error: Usage [[TYPE: selector | text]]"

        if "[[LOOK_AT_SCREEN]]" in content:
            return f"SCREEN ANALYSIS: {self._look_at_screen()}"
        
        if "[[QUERY_KB:" in content:
            q = self._extract_arg(content, "[[QUERY_KB:")
            return f"KNOWLEDGE BASE: {self.kb.query(q)}"
            
        if "[[INDEX_PROJECT]]" in content:
            return self.kb.index_project(os.getcwd())

        if "[[RUN:" in content:
            cmd = self._extract_arg(content, "[[RUN:")
            return self._run_command(cmd)

        if "[[SEARCH:" in content:
            q = self._extract_arg(content, "[[SEARCH:")
            return self._search_web(q)
            
        if "[[LIST_FILES:" in content:
            path = self._extract_arg(content, "[[LIST_FILES:")
            return self._list_files(path)
            
        if "[[READ_FILE:" in content:
            path = self._extract_arg(content, "[[READ_FILE:")
            return self._read_file(path)
            
        if "[[WRITE_FILE:" in content:
            args = self._extract_arg(content, "[[WRITE_FILE:")
            return self._write_file(args)
            
        if "[[GREP:" in content:
            args = self._extract_arg(content, "[[GREP:")
            return self._grep_files(args)
            
        # Global Inputs
        if "[[MOUSE_MOVE:" in content:
            args = self._extract_arg(content, "[[MOUSE_MOVE:")
            return self._mouse_move(args)
            
        if "[[MOUSE_CLICK:" in content:
            args = self._extract_arg(content, "[[MOUSE_CLICK:")
            return self._mouse_click(args)
            
        if "[[KEYBOARD_TYPE:" in content:
            text = self._extract_arg(content, "[[KEYBOARD_TYPE:")
            return self._keyboard_type(text)
            
        if "[[KEYBOARD_PRESS:" in content:
            key = self._extract_arg(content, "[[KEYBOARD_PRESS:")
            return self._keyboard_press(key)
        
        # Advanced Future Tools
        if "[[WATCH:" in content:
            condition = self._extract_arg(content, "[[WATCH:")
            return self.scheduler.start_watch_dog(condition)
            
        if "[[SCHEDULE:" in content:
            args = self._extract_arg(content, "[[SCHEDULE:")
            if "|" in args:
                mins, task = args.split("|", 1)
                return self.scheduler.add_schedule(mins.strip(), task.strip())
            return "Error: Usage [[SCHEDULE: mins | task]]"
            
        if "[[WAIT:" in content:
            secs = self._extract_arg(content, "[[WAIT:")
            return self._wait(secs)

        if "[[FOCUS:" in content:
            app_name = self._extract_arg(content, "[[FOCUS:")
            return self._focus_window(app_name)

        return None

    def _extract_arg(self, text, trigger):
        start = text.find(trigger) + len(trigger)
        end = text.find("]]", start) # Fix rfind issue for multiple tools
        if end == -1: end = len(text)
        return text[start:end].strip()

    # --- Tool Implementations ---
    def _focus_window(self, app_name):
        # Robust Focus: Find by Title, Exclude Self (Nemotron), Activate by PID
        ps_script = f"""
        $target = "{app_name}"
        # Find process with matching title but EXCLUDE our own agent window
        $p = Get-Process | Where-Object {{ $_.MainWindowTitle -match $target -and $_.MainWindowTitle -notmatch "Nemotron" }} | Select-Object -First 1
        
        if ($p) {{
            $ws = New-Object -ComObject WScript.Shell
            $ws.AppActivate($p.Id)
            Start-Sleep -Milliseconds 500
            
            # Verify if it worked by checking foreground window (optional, kept simple for now)
            Write-Output "Success: Focused '$($p.MainWindowTitle)'"
        }} else {{
            Write-Output "Fail: Could not find external window matching '$target'"
        }}
        """
        try:
            import subprocess
            cmd = ["powershell", "-NoProfile", "-Command", ps_script]
            res = subprocess.run(cmd, capture_output=True, text=True)
            
            if "Success" in res.stdout:
                return res.stdout.strip()
            elif "Fail" in res.stdout:
                return res.stdout.strip()
            else:
                return f"Error focusing '{app_name}': {res.stderr}"
        except Exception as e:
            return f"Error focusing: {e}"

    def _wait(self, seconds):
        try:
            sec_val = float(seconds)
            import time
            time.sleep(sec_val)
            return f"Waited {sec_val} seconds."
        except:
            return "Error: Invalid seconds for WAIT."

    def _mouse_move(self, args):
        try:
            x, y = map(int, args.split(","))
            pyautogui.moveTo(x, y)
            return f"Moved mouse to {x}, {y}"
        except Exception as e: return f"Error moving mouse: {e}"

    def _mouse_click(self, btn):
        try:
            if "double" in btn: pyautogui.doubleClick()
            elif "right" in btn: pyautogui.click(button='right')
            else: pyautogui.click()
            return f"Clicked mouse ({btn})"
        except Exception as e: return f"Error clicking mouse: {e}"

    def _keyboard_type(self, text):
        try:
            # typewrite is safer
            pyautogui.write(text, interval=0.01)
            return f"Typed '{text}'"
        except Exception as e: return f"Error typing: {e}"

    def _keyboard_press(self, key):
        try:
            pyautogui.press(key)
            return f"Pressed '{key}'"
        except Exception as e: return f"Error pressing key: {e}"

    def _analyze_image_file(self, path):
        with open(path, 'rb') as f:
            img_bytes = f.read()
        res = ollama.chat(model=self.vision_model, messages=[{
            'role': 'user', 'content': 'Describe this image in detail.', 'images': [img_bytes]
        }])
        return res['message']['content']

    def _analyze_image_object(self, pil_image, prompt):
        # Convert PIL image to bytes
        img_byte_arr = io.BytesIO()
        pil_image.save(img_byte_arr, format='PNG')
        img_bytes = img_byte_arr.getvalue()
        
        res = ollama.chat(model=self.vision_model, messages=[{
            'role': 'user', 'content': prompt, 'images': [img_bytes]
        }])
        return res['message']['content']

    def _look_at_screen(self):
        # ... logic from local_agent.py ...
        screenshot = pyautogui.screenshot()
        img_byte_arr = io.BytesIO()
        screenshot.save(img_byte_arr, format='PNG')
        try:
            res = ollama.chat(model=self.vision_model, messages=[{
                'role': 'user', 'content': 'Describe this screen.', 'images': [img_byte_arr.getvalue()]
            }])
            return res['message']['content']
        except: return "Vision Error"

    def _run_command(self, cmd):
        try:
            if cmd.lower().startswith("powershell"):
                res = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=30)
            else:
                res = subprocess.run(["powershell", "-c", cmd], capture_output=True, text=True, timeout=30)
            return (res.stdout + res.stderr) or "(No Output)"
        except Exception as e: return str(e)

    def _search_web(self, query):
        try:
            res = DDGS().text(query, max_results=3)
            return "\n".join([f"{r['title']}: {r['body']}" for r in res]) if res else "No results."
        except Exception as e: return str(e)

    def _list_files(self, path):
        # Reuse logic
        try:
            if not path or path == ".": path = os.getcwd()
            items = os.listdir(path)
            return "\n".join(items[:50]) + ("\n...(more)" if len(items) > 50 else "")
        except Exception as e: return str(e)
        
    def _read_file(self, path):
        try:
            with open(path, 'r', encoding='utf-8', errors='ignore') as f: return f.read()
        except Exception as e: return str(e)
        
    def _write_file(self, args):
        try:
            path, content = args.split("|", 1)
            with open(path.strip(), 'w', encoding='utf-8') as f: f.write(content.strip())
            return f"Wrote to {path}"
        except Exception as e: return str(e)
    
    def _grep_files(self, args):
        """Simplistic GREP using Ripgrep logic (subprocess) or python walk."""
        try:
            pattern, path = args.split("|", 1)
            # Use git grep or just recursive search in python
            # Let's use simple python walk since grep might not be installed
            pattern = pattern.strip()
            path = path.strip() or "."
            matches = []
            for root, dirs, files in os.walk(path):
                if '.git' in dirs: dirs.remove('.git')
                for file in files:
                    if file.endswith(('.py', '.js', '.md', '.txt')):
                        fp = os.path.join(root, file)
                        try:
                            with open(fp, 'r', encoding='utf-8', errors='ignore') as f:
                                for i, line in enumerate(f):
                                    if pattern in line:
                                        matches.append(f"{fp}:{i+1}: {line.strip()}")
                                        if len(matches) > 20: break
                        except: pass
                if len(matches) > 20: break
            return "\n".join(matches) if matches else "No matches found."
        except Exception as e: return str(e)
