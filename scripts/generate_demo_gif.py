"""
Script to capture headless screenshots of the Dev Studio scenarios
and compile an optimized, high-fidelity animated GIF demo for README.md.
"""

import os
import time
from PIL import Image
from playwright.sync_api import sync_playwright

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "docs", "images")
os.makedirs(OUTPUT_DIR, exist_ok=True)

FRAMES = [
    {
        "name": "dev_studio_healthcare_overview.png",
        "url": "http://localhost:5173/?scenario=healthcare",
        "description": "Healthcare Hierarchy, Small-Number Suppression (<5), Delta Variance",
    },
    {
        "name": "dev_studio_sales_pivot.png",
        "url": "http://localhost:5173/?scenario=sales_pivot",
        "description": "Sales Multi-Pivot Matrix, In-Cell Data Bars, Rollup Semantics",
    },
    {
        "name": "dev_studio_stress_test.png",
        "url": "http://localhost:5173/?scenario=stress_5k",
        "description": "Virtualization Stress Test: 5,000 Rows, 60fps Scrolling",
    },
    {
        "name": "dev_studio_whatif_simulation.png",
        "url": "http://localhost:5173/?scenario=healthcare&whatif=1",
        "description": "What-If Simulation Engine: Range Sliders (-50% to +50%), In-Cell Polarity Badges, Scenarios",
        "action": "whatif",
    },
    {
        "name": "dev_studio_api_export_modal.png",
        "url": "http://localhost:5173/?scenario=healthcare&apiModal=1",
        "description": "Superset REST API Modal (POST /api/v1/chart/), Schema & cURL/Python",
    },
]

def capture_frames():
    print(f"Capturing {len(FRAMES)} screenshots with Playwright...")
    captured_paths = []
    
    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path=CHROME_PATH,
            headless=True,
        )
        page = browser.new_page(viewport={"width": 1600, "height": 1000})
        
        for frame in FRAMES:
            out_path = os.path.abspath(os.path.join(OUTPUT_DIR, frame["name"]))
            print(f"Navigating: {frame['url']} -> {frame['name']}")
            page.goto(frame["url"])
            page.wait_for_timeout(2000)
            
            if frame.get("action") == "whatif":
                try:
                    title_btn = page.locator(".whatif-title-btn")
                    if title_btn.count() > 0:
                        title_btn.first.click()
                        page.wait_for_timeout(400)
                    sliders = page.locator(".whatif-slider-input")
                    if sliders.count() > 0:
                        sliders.first.fill("15")
                        sliders.first.dispatch_event("input")
                        sliders.first.dispatch_event("change")
                        page.wait_for_timeout(800)
                except Exception as e:
                    print(f"Warning during whatif interaction: {e}")
            
            page.screenshot(path=out_path)
            size_kb = os.path.getsize(out_path) / 1024
            print(f"Captured {frame['name']} ({size_kb:.1f} KB)")
            captured_paths.append(out_path)
            time.sleep(0.5)
            
        browser.close()
        
    return captured_paths

def generate_gif(image_paths):
    gif_path = os.path.join(OUTPUT_DIR, "dev_studio_demo.gif")
    print(f"Compiling animated GIF: {gif_path}...")
    
    pil_frames = []
    target_size = (1280, 800)
    
    for path in image_paths:
        img = Image.open(path).convert("RGB")
        # High quality resize
        img_resized = img.resize(target_size, Image.Resampling.LANCZOS)
        # Convert to P mode with adaptive palette for crisp GIF rendering
        p_frame = img_resized.quantize(colors=256, method=Image.Resampling.LANCZOS)
        pil_frames.append(p_frame)
    
    if pil_frames:
        # 2200 ms per slide for comfortable reading of the UI
        pil_frames[0].save(
            gif_path,
            save_all=True,
            append_images=pil_frames[1:],
            duration=2200,
            loop=0,
            optimize=True,
        )
        size_mb = os.path.getsize(gif_path) / (1024 * 1024)
        print(f"Generated {gif_path} successfully ({size_mb:.2f} MB)")
    else:
        print("No frames found to generate GIF")

if __name__ == "__main__":
    paths = capture_frames()
    generate_gif(paths)
