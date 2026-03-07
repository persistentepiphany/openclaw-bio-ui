"""BioSentinel project write-up  --  4-page PDF generator."""

from fpdf import FPDF
from fpdf.enums import XPos, YPos

# Palette
G      = (48, 209, 88)
PU     = (94, 92, 230)
RED    = (255, 69, 58)
BK     = (15, 15, 15)
WH     = (255, 255, 255)
MU     = (110, 110, 120)
LBG    = (243, 247, 243)
RU     = (218, 228, 218)

LH = 4.4   # body line height
FS = 8.2   # body font size


class Doc(FPDF):
    def __init__(self):
        super().__init__("P", "mm", "A4")
        self.set_auto_page_break(True, margin=16)
        self.set_margins(18, 18, 18)
        self.W = 210 - 36

    def header(self):
        if self.page_no() == 1:
            return
        self.set_fill_color(*G)
        self.rect(0, 0, 210, 1.2, "F")
        self.set_font("Helvetica", "B", 6.5)
        self.set_text_color(*MU)
        self.set_y(4)
        self.cell(0, 3, "BIOSENTINEL  --  Imperial College London Hackathon  --  2025",
                  align="C", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.ln(1)

    def footer(self):
        self.set_y(-12)
        self.set_font("Helvetica", "", 6.5)
        self.set_text_color(*MU)
        self.cell(0, 4, f"{self.page_no()} / 4", align="C")

    # -- helpers --
    def sec(self, num, title):
        self.ln(4)
        self.set_fill_color(*BK)
        self.rect(self.l_margin, self.get_y(), self.W, 6.5, "F")
        self.set_fill_color(*G)
        self.rect(self.l_margin, self.get_y(), 3, 6.5, "F")
        self.set_xy(self.l_margin + 5, self.get_y() + 1.2)
        self.set_font("Helvetica", "B", 8)
        self.set_text_color(*WH)
        self.cell(0, 4.5, f"{num}  {title.upper()}", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.ln(1.5)

    def sub(self, title):
        self.ln(2.5)
        self.set_font("Helvetica", "B", 8)
        self.set_text_color(*BK)
        self.cell(0, 4, title, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.set_draw_color(*G)
        self.set_line_width(0.5)
        y = self.get_y()
        self.line(self.l_margin, y, self.l_margin + 24, y)
        self.ln(1.5)

    def body(self, txt, indent=0):
        self.set_font("Helvetica", "", FS)
        self.set_text_color(*BK)
        self.set_x(self.l_margin + indent)
        self.multi_cell(self.W - indent, LH, txt, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.ln(0.5)

    def bul(self, txt):
        self.set_font("Helvetica", "B", FS)
        self.set_text_color(*G)
        bw = self.get_string_width("> ")
        self.cell(bw, LH, "> ", new_x=XPos.RIGHT, new_y=YPos.TOP)
        self.set_font("Helvetica", "", FS)
        self.set_text_color(*BK)
        self.multi_cell(self.W - bw, LH, txt, new_x=XPos.LMARGIN, new_y=YPos.NEXT)

    def metrics(self, items):
        n = len(items)
        bw = (self.W - (n-1)*2) / n
        x0, y0 = self.l_margin, self.get_y()
        bh = 12
        for i, (lbl, val) in enumerate(items):
            x = x0 + i*(bw+2)
            self.set_fill_color(*LBG)
            self.rect(x, y0, bw, bh, "F")
            self.set_draw_color(*G)
            self.set_line_width(0.8)
            self.line(x, y0, x+bw, y0)
            self.set_font("Helvetica", "B", 10)
            self.set_text_color(*G)
            self.set_xy(x, y0+1.5)
            self.cell(bw, 5, val, align="C", new_x=XPos.RIGHT, new_y=YPos.TOP)
            self.set_font("Helvetica", "", 6.5)
            self.set_text_color(*MU)
            self.set_xy(x, y0+7)
            self.cell(bw, 3.5, lbl, align="C", new_x=XPos.RIGHT, new_y=YPos.TOP)
        self.set_y(y0+bh+2)

    def two_col(self, items, fs=7.8):
        cw = (self.W - 5) / 2
        x0, y0 = self.l_margin, self.get_y()
        cy = [y0, y0]
        for i, txt in enumerate(items):
            col = i % 2
            x = x0 + col*(cw+5)
            self.set_xy(x, cy[col])
            self.set_font("Helvetica", "B", fs)
            self.set_text_color(*G)
            self.cell(3.5, LH, ">", new_x=XPos.RIGHT, new_y=YPos.TOP)
            self.set_font("Helvetica", "", fs)
            self.set_text_color(*BK)
            self.set_xy(x+3.5, cy[col])
            self.multi_cell(cw-3.5, LH, txt, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
            cy[col] = self.get_y() + 0.8
        self.set_y(max(cy)+1)

    def table(self, headers, rows, col_ws):
        x0, y0 = self.l_margin, self.get_y()
        rh = 5
        # header
        self.set_fill_color(*BK)
        self.rect(x0, y0, self.W, rh, "F")
        x = x0
        for h, cw in zip(headers, col_ws):
            self.set_xy(x+1, y0+1)
            self.set_font("Helvetica", "B", 6.5)
            self.set_text_color(*WH)
            self.cell(cw, 3.5, h, new_x=XPos.RIGHT, new_y=YPos.TOP)
            x += cw + 1
        self.set_y(y0+rh)
        for i, row in enumerate(rows):
            y = self.get_y()
            self.set_fill_color(*LBG if i%2==0 else WH)
            self.rect(x0, y, self.W, rh, "F")
            x = x0
            for j, (cell, cw) in enumerate(zip(row, col_ws)):
                self.set_xy(x+1, y+1)
                if j == 0:
                    self.set_font("Courier", "B", 7)
                    self.set_text_color(*PU)
                else:
                    self.set_font("Helvetica", "", 7)
                    self.set_text_color(*BK)
                self.cell(cw, 3.5, cell, new_x=XPos.RIGHT, new_y=YPos.TOP)
                x += cw + 1
            self.set_y(y+rh)

    def callout(self, label, txt, color=RED, h=14):
        bx, y0 = self.l_margin, self.get_y()
        self.set_fill_color(255, 248, 246)
        self.rect(bx, y0, self.W, h, "F")
        self.set_draw_color(*color)
        self.set_line_width(1)
        self.line(bx, y0, bx, y0+h)
        self.set_xy(bx+3.5, y0+1.5)
        self.set_font("Helvetica", "B", 7)
        self.set_text_color(*color)
        self.cell(0, 3.5, label, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.set_x(bx+3.5)
        self.set_font("Helvetica", "", 7.8)
        self.set_text_color(*BK)
        self.multi_cell(self.W-5, LH-0.2, txt, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.set_y(y0+h+1)


def build():
    p = Doc()

    # ================================================================
    # PAGE 1  --  Cover + Abstract + Problem
    # ================================================================
    p.add_page()

    # Hero
    p.set_fill_color(*G)
    p.rect(0, 0, 210, 34, "F")
    p.set_y(6)
    p.set_font("Helvetica", "B", 24)
    p.set_text_color(*WH)
    p.cell(0, 9, "BioSentinel", align="C", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    p.set_font("Helvetica", "", 8.5)
    p.set_text_color(210, 255, 218)
    p.cell(0, 4.5,
           "Real-time Pandemic Intelligence  |  Autonomous Binder Design  |  Biosecurity at Every Step",
           align="C", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    p.set_font("Helvetica", "", 7)
    p.set_text_color(170, 240, 185)
    p.cell(0, 4, "Imperial College London Hackathon  |  2025",
           align="C", new_x=XPos.LMARGIN, new_y=YPos.NEXT)

    # Abstract
    p.set_y(40)
    bx = p.l_margin
    p.set_fill_color(*LBG)
    p.rect(bx, p.get_y(), p.W, 28, "F")
    p.set_draw_color(*G)
    p.set_line_width(1)
    p.line(bx, p.get_y(), bx, p.get_y()+28)
    p.set_xy(bx+4, p.get_y()+2)
    p.set_font("Helvetica", "B", 6.5)
    p.set_text_color(*MU)
    p.cell(0, 3, "ABSTRACT", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    p.set_x(bx+4)
    p.set_font("Helvetica", "", 8)
    p.set_text_color(*BK)
    p.multi_cell(p.W-6, 4.2,
        "BioSentinel is an end-to-end pandemic preparedness platform connecting real-time global health "
        "surveillance to autonomous therapeutic candidate design and mandatory biosecurity screening. "
        "Built at the Imperial College London Hackathon, it ingests live signals from ten public health "
        "sources, applies a dual-LLM pipeline (Flock.io DeepSeek V3.2 + Z.ai GLM-4.7) to score and "
        "contextualise outbreaks, identifies structural protein targets, designs binder candidates de novo "
        "via RFdiffusion + ProteinMPNN, validates them across variants with Boltz-2, and screens every "
        "candidate for biosecurity risk using Foldseek TM-align -- all from a single analyst dashboard. "
        "From first outbreak signal to screened candidate PDB in one session.",
        new_x=XPos.LMARGIN, new_y=YPos.NEXT)

    # Metrics
    p.ln(2)
    p.metrics([
        ("Python lines", "~8,200"), ("Modules", "28"), ("Data sources", "10"),
        ("Pipeline stages", "5"), ("LLM providers", "2"), ("Protein targets", "7"),
    ])

    # Problem
    p.sec("01", "Problem")

    p.body(
        "The gap between outbreak detection and therapeutic response has cost lives in every modern pandemic. "
        "During COVID-19, months elapsed between the first genomic sequences and the first validated drug "
        "candidates -- not because the biology was intractable, but because intelligence, target identification, "
        "and computational design existed in disconnected silos on separate timelines."
    )
    p.body(
        "Public health surveillance today is largely manual: epidemiologists monitor WHO bulletins and CDC "
        "alerts by hand. When a credible signal emerges it takes additional days to translate it into a "
        "structural question -- which protein, which strains, which pipeline -- and biosecurity review is "
        "typically an afterthought conducted late when the cost of failure is highest."
    )
    p.body(
        "The computational tools for de novo binder design (RFdiffusion, ProteinMPNN, Boltz-2) are now "
        "mature and tractable in hours on accessible hardware. The bottleneck is pure orchestration: "
        "no system connects an outbreak signal to an automated, biosecurity-screened design workflow "
        "within a single analyst session."
    )
    p.callout(
        "Core problem statement",
        "There is no platform that takes an analyst from outbreak alert to biosecurity-screened "
        "therapeutic candidate PDB without switching tools, teams, or timelines.",
        color=RED, h=13
    )

    # ================================================================
    # PAGE 2  --  Approach
    # ================================================================
    p.add_page()
    p.sec("02", "Approach")

    p.sub("Intelligence Layer")
    p.body(
        "The scraper service monitors ten live sources on a configurable interval: WHO Disease Outbreak News, "
        "CDC Health Alert Network, CIDRAP Avian Influenza and AMR feeds, ECDC outbreak news, four Google News "
        "RSS proxies (H5N1, Mpox, avian flu, outbreaks), and X/Twitter API v2. Some 200-400 raw entries are "
        "retrieved per cycle and passed through a two-pass relevance filter: a fast heuristic removes "
        "administrative noise, then a Flock.io DeepSeek V3.2 (131K context) batch call classifies remaining "
        "uncertain entries. A rule-based threat assessor scores retained entries on source authority, keyword "
        "density, recency, and geographic spread, grouping them into pathogen clusters. Finally, Z.ai GLM-4.7 "
        "(204K context) extracts structured outbreak events: normalised pathogen name, canonical location, "
        "case/death counts, and WHO severity level."
    )

    p.sub("Target Identification and Protein Discovery")
    p.body(
        "When a threat report arrives, BioSentinel extracts pathogen names from flagged entries via regex "
        "(H5N1, Nipah, Ebola, SARS-CoV-2, Mpox, Marburg, Zika, Dengue and others) and maps them to curated "
        "PDB identifiers: H5N1 neuraminidase (4NQJ), Nipah G glycoprotein (7L1F), Ebola VP40 (5T6N), "
        "SARS-CoV-2 Mpro (6VMZ / 6LU7), spike RBD (7BV2), and anthrax PA (3I6G). Unknown proteins are "
        "fetched from RCSB PDB on demand and bundled with structural analysis. Detected strains are "
        "highlighted in the live threat feed and surfaced to the analyst as suggested pipeline targets."
    )

    p.sub("Computational Design Pipeline")
    p.body(
        "Five stages run sequentially with graceful partial failure. (1) Epitope Detection: BioPython + "
        "Shrake-Rupley SASA identifies conserved antigenic surface residues. (2) Binder Generation: "
        "RFdiffusion diffuses novel backbone structures from Gaussian noise conditioned on the epitope site; "
        "ProteinMPNN designs sequences for each backbone. (3) Cross-Variant Validation: Boltz-2 predicts "
        "structures for each candidate against multiple variant PDBs, scoring by pLDDT and PAE. "
        "(4) Biosecurity Screening: Foldseek TM-align compares all candidates against a curated toxin "
        "database; any candidate with TM-score >= 0.5 is flagged. (5) Report: unified candidate manifest, "
        "cross-variant heatmap, and biosecurity panel served to the dashboard in real time."
    )

    p.sub("AI Integration -- Flock.io, Z.ai, and AminaAnalytica")
    p.body(
        "Three AI systems operate across the platform. Flock.io (DeepSeek V3.2 primary; Qwen3-235B and "
        "Kimi-K2.5 as intra-provider fallbacks) handles batch relevance classification and report "
        "systematisation. Z.ai (GLM-4.7-flash, 204K context) powers the interactive analyst chat assistant, "
        "which has access to seven live tools: run_pipeline, targeted_scrape, suggest_pipeline_target, "
        "search_threats, get_report, refresh_dashboard, get_candidate_details. It also generates per-protein "
        "science summaries covering structure, binding sites, and dual-use risks. AminaAnalytica "
        "(/api/amina/*) provides generic async bioinformatics tool execution with per-step file retrieval. "
        "Every LLM call follows a fallback chain: Flock.io first, Z.ai on any failure; if both fail, "
        "the pipeline continues with heuristic-only output. Telegram (@biosentinelbot) and Discord "
        "(BioSentinel Bot#6755) deliver high-severity alerts to analyst channels non-blocking."
    )

    # Pipeline flow strip
    p.ln(1)
    p.set_fill_color(*BK)
    p.rect(p.l_margin, p.get_y(), p.W, 7, "F")
    p.set_xy(p.l_margin+2, p.get_y()+1.5)
    p.set_font("Courier", "", 7)
    p.set_text_color(*G)
    p.cell(0, 4,
           "SCRAPE (10 src, ~40s)  ->  FILTER (Flock.io LLM)  ->  ASSESS (rules)  ->  "
           "DESIGN (RFdiffusion+MPNN)  ->  VALIDATE (Boltz-2)  ->  SCREEN (Foldseek)",
           new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    p.ln(2)

    # ================================================================
    # PAGE 3  --  Results
    # ================================================================
    p.add_page()
    p.sec("03", "Results")

    p.sub("Intelligence Pipeline Performance")
    p.body(
        "The scrape stage completes in ~40 seconds; full pipeline (scrape, filter, assess, report, "
        "systematise) takes 2-4 minutes depending on LLM latency. The two-pass relevance filter reduces "
        "raw entry volume by 75-85%, with the Flock.io batch classification processing 50-100 entries in "
        "a single API call. Threat clustering correctly groups entries by pathogen across historical WHO and "
        "CDC bulletin test sets, with confidence scores correlating strongly with known outbreak severity. "
        "The fallback chain (Flock.io -> Z.ai) maintained 100% uptime across all test runs."
    )

    p.sub("Computational Pipeline Demonstration")
    p.body(
        "End-to-end demonstration ran on SARS-CoV-2 Mpro (6VMZ) as primary target with H5N1 neuraminidase "
        "(4NQJ) as the variant validation set. Epitope detection resolved the catalytic dyad pocket "
        "(His41/Cys145) as the primary binding site. RFdiffusion generated 60-120 residue backbone "
        "scaffolds; ProteinMPNN produced four candidate sequences per run. Boltz-2 validation scored "
        "the best candidate above pLDDT 0.75. All candidates cleared the Foldseek biosecurity screen "
        "(TM-score < 0.5 against the toxin database). Results were visible in the dashboard biosecurity "
        "panel within seconds of the screen completing."
    )

    p.sub("AI Assistant and Protein Visualisation")
    p.body(
        "The Z.ai chat assistant successfully executed multi-step tool chains (scrape -> identify target "
        "-> run pipeline) within a single conversation without human intervention, demonstrating the "
        "agentic loop across all seven available tools. Z.ai protein science summaries generated in under "
        "3 seconds per protein: structure topology, binding site residues, druggability, and dual-use "
        "biosecurity considerations. The dual-engine molecule viewer (3Dmol.js lightweight / Molstar "
        "research-grade) rendered all seven pre-bundled proteins with cartoon, surface, ball-and-stick, "
        "and electrostatic overlays. The Intelligence Map rendered geocoded incidents on a Mapbox GL globe "
        "with a real-time AI threat landscape narrative generated by Z.ai."
    )

    p.sub("Dashboard and UX")
    p.body(
        "Live mode runs a staged initialisation: Scraping -> Strains Found (detected pathogens highlighted "
        "in green across the feed) -> Ready to Run. The Gather Intel button triggers the scraper, shows "
        "skeleton rows while results arrive, then trickles items in with staggered animation. Demo mode "
        "loads instantly with seed data -- no backend required for evaluation."
    )

    # Key achievements
    p.ln(1)
    p.set_font("Helvetica", "B", 7)
    p.set_text_color(*MU)
    p.cell(0, 3.5, "KEY ACHIEVEMENTS", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    p.ln(1)
    p.two_col([
        "Outbreak signal -> screened candidate PDB in one analyst session",
        "LLM filter cuts 75-85% noise before any heavy compute",
        "AI assistant runs full multi-step tool chains autonomously",
        "Biosecurity screen mandatory and unskippable on every candidate",
        "Strain names highlighted live in threat feed as reports arrive",
        "3Dmol + Molstar dual-engine viewer with AI protein summaries",
        "Telegram + Discord alert delivery for high-severity events",
        "Demo mode: zero backend, loads instantly for reviewers",
    ])

    # Tech stack table
    p.ln(1)
    p.set_font("Helvetica", "B", 7)
    p.set_text_color(*MU)
    p.cell(0, 3.5, "TECHNOLOGY STACK", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    p.ln(1)
    w1, w2 = 30, p.W - 31
    stack = [
        ("Frontend", "React 19, Vite 7, Tailwind CSS 4, Framer Motion, Mapbox GL JS"),
        ("3D / Charts", "3Dmol.js, Molstar, Recharts"),
        ("AI Primary", "Flock.io -- DeepSeek V3.2 / Qwen3-235B / Kimi-K2.5 (131K ctx)"),
        ("AI Secondary", "Z.ai -- GLM-4.7-flash (204K ctx); AminaAnalytica tool executor"),
        ("Compute", "RFdiffusion, ProteinMPNN, Boltz-2, Foldseek, BioPython / Shrake-Rupley"),
        ("Backend", "FastAPI 1.1.0 on Railway; Python 3.10+; ~8,200 lines across 28 modules"),
        ("Infra", "Vercel (frontend), Railway (API), VPS + Cloudflare tunnel (scraper)"),
        ("Alerts", "Telegram @biosentinelbot, Discord BioSentinel Bot#6755"),
    ]
    x0, y0 = p.l_margin, p.get_y()
    rh = 4.5
    for i, (lbl, val) in enumerate(stack):
        y = y0 + i*rh
        fill = LBG if i%2==0 else WH
        p.set_fill_color(*fill)
        p.rect(x0, y, p.W, rh, "F")
        p.set_xy(x0+1, y+0.8)
        p.set_font("Helvetica", "B", 7)
        p.set_text_color(*MU)
        p.cell(w1, 3, lbl+":", new_x=XPos.RIGHT, new_y=YPos.TOP)
        p.set_font("Helvetica", "", 7)
        p.set_text_color(*BK)
        p.set_xy(x0+w1+1, y+0.8)
        p.cell(w2, 3, val, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    p.set_y(y0 + len(stack)*rh + 2)

    # ================================================================
    # PAGE 4  --  Next Steps + Protein Targets
    # ================================================================
    p.add_page()
    p.sec("04", "Next Steps")

    next_steps = [
        (
            "Fully Autonomous Pipeline Trigger",
            "When a detected threat exceeds a configurable confidence threshold and a mapped protein "
            "target is available, the pipeline will trigger automatically with sensible defaults (Quick Scan, "
            "4 candidates, primary strain as target), delivering results to Telegram/Discord with no "
            "analyst intervention between outbreak signal and candidate report."
        ),
        (
            "Expanded Pathogen Coverage",
            "Extend the pathogen-protein map to the full WHO Priority Pathogen List (Crimean-Congo HF, "
            "Rift Valley fever, Lassa fever, Disease X placeholders), with automated RCSB PDB and "
            "AlphaFold Database lookup for pathogens with no cached mapping."
        ),
        (
            "Biosecurity Framework Hardening",
            "Integrate the NCBI Select Agent list and WHO DURC guidance as structured quarterly-updated "
            "data sources. Add a secondary sequence-level screen (BLAST against UniProt toxic protein "
            "families) running in parallel with the Foldseek structural screen."
        ),
        (
            "Multi-Candidate Prioritisation Model",
            "A scoring model integrating pLDDT, PAE, cross-variant binding consistency, and biosecurity "
            "clearance will rank candidates automatically. The Z.ai assistant will gain a compare_candidates "
            "tool generating structured comparison narratives across the ranked list."
        ),
        (
            "Experimental Handoff Format",
            "Define a structured CRO handoff document (target protein, candidate sequence, binding site "
            "coordinates, cross-variant scores, biosecurity clearance) exportable from the pipeline results "
            "overlay alongside the existing JSON report."
        ),
        (
            "Federated Intelligence Network",
            "Enable multiple BioSentinel deployments (regional agencies, academic consortia) to share "
            "anonymised threat signal metadata, improving early detection for signals that are statistically "
            "weak at any single node but significant in aggregate."
        ),
    ]

    for title, body in next_steps:
        p.sub(title)
        p.body(body)

    # Protein targets table
    p.ln(2)
    p.set_font("Helvetica", "B", 7)
    p.set_text_color(*MU)
    p.cell(0, 3.5, "PRE-BUNDLED PROTEIN TARGETS", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    p.ln(1)
    cols = ["PDB ID", "Pathogen", "Target Protein", "Key Features"]
    cws  = [16, 30, 42, p.W - 16 - 30 - 42 - 3]
    rows = [
        ["6VMZ", "SARS-CoV-2", "Main Protease (Mpro)", "His41/Cys145 catalytic dyad; beta-barrel I-II + alpha-helical III"],
        ["7BV2", "SARS-CoV-2", "Spike RBD",             "ACE2 receptor-binding interface; primary vaccine target"],
        ["6LU7", "SARS-CoV-2", "Mpro + N3 inhibitor",  "Protease in complex; drug-bound binding pose captured"],
        ["4NQJ", "H5N1 Influenza", "Neuraminidase",     "Tetrameric surface enzyme; sialic acid active site"],
        ["7L1F", "Nipah virus",    "G glycoprotein",    "Beta-propeller fold; ephrin-B2/B3 receptor binding"],
        ["5T6N", "Ebola virus",    "VP40 matrix protein","Octameric ring structure; RNA-binding interface"],
        ["3I6G", "Anthrax",        "Protective antigen","Heptameric pore-forming toxin; domain 4 receptor contact"],
    ]
    p.table(cols, rows, cws)

    # Closing banner
    p.ln(4)
    p.set_fill_color(*G)
    cy = p.get_y()
    p.rect(p.l_margin, cy, p.W, 16, "F")
    p.set_xy(p.l_margin+4, cy+2.5)
    p.set_font("Helvetica", "B", 9)
    p.set_text_color(*WH)
    p.cell(0, 5, "openclawui-gilt.vercel.app", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    p.set_x(p.l_margin+4)
    p.set_font("Helvetica", "", 7.5)
    p.set_text_color(200, 255, 215)
    p.cell(0, 4.5,
           "Telegram: @biosentinelbot   |   Discord: BioSentinel Bot#6755   |   "
           "github.com/persistentepiphany/openclaw-bio-ui",
           new_x=XPos.LMARGIN, new_y=YPos.NEXT)

    out = "/Users/maximkazakov/openclaw_ui/BioSentinel_Writeup.pdf"
    p.output(out)
    print(f"Written: {out}  ({p.page} pages)")


if __name__ == "__main__":
    build()
