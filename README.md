MEDRESQ AI 🏥🤖
AI-Powered PHC Operations, Medicine Intelligence & Smart Supply Chain
Rajasthan Pilot → India Scale → BRICS-Ready Vision
MEDRESQ AI is a healthcare operations and decision-support platform designed to help Primary Health Centres (PHCs) monitor medicine availability, identify stock risks, understand demand patterns, coordinate transfers, and digitize physical register workflows.
The project focuses on a practical problem:
How can we help frontline healthcare teams move from fragmented operational data to faster, more informed decisions?


⸻


🚨 The Problem
Primary healthcare facilities often manage critical operational information across multiple workflows:
Medicine inventory and expiry tracking
Stock-out risks
Seasonal demand fluctuations
PHC-to-PHC medicine transfers
Physical registers
Staff attendance
Alerts and operational warnings
Manual reporting and data entry
When these signals remain disconnected, identifying a developing shortage or coordinating a response can take valuable time.


⸻


💡 Our Solution
MEDRESQ AI brings these workflows together into an operational command hub.
Core capabilities
Module Purpose
💊 Medicine Inventory Monitor stock, critical medicines and FEFO-related risks
📈 Demand & Surge Forecast Support seasonal and consumption-based demand assessment
🔄 Orders & PHC Transfers Track medicine requisitions, routing and transfer workflows
🗺️ Network Stock Map Visualise PHC-level operational risk geographically
📷 Register OCR Digitise information from physical PHC registers
🎙️ Voice Capture Support voice-based register/data entry workflows
🤖 Gemini Intelligence Provide AI-assisted operational insights
⚠️ Alerts & Queue Surface critical operational warnings
👥 Staff Attendance Monitor facility-level staffing information
📄 Reports Export operational information for review


⸻


🤖 AI Integration
MEDRESQ AI uses AI as an operational intelligence and decision-support layer, rather than replacing clinical or administrative authority.
AI-assisted workflows include:
Physical Register
Image → OCR → Extraction → Matching → Human Verification → Ledger
Voice Workflow
Voice → Speech Recognition / Transcription → Structured Command → Verification
Operational Intelligence
Facility Data → Signals → Gemini-assisted Interpretation → Decision Support
The system maintains a Human-in-the-Loop approach for important operational actions.
AI recommendations are intended as decision support and should not replace clinical judgement, medical-officer approval, or official healthcare protocols.


⸻


🧠 Deterministic Logic + AI
One important design principle of MEDRESQ AI is separating deterministic operational calculations from AI-generated interpretation.
Deterministic layer
Used for things such as:
Stock calculations
Safety-buffer thresholds
FEFO-related checks
Replenishment calculations
Operational status
Transfer workflow states
AI layer
Used for:
Natural-language understanding
OCR assistance
Voice interaction
Summarisation
Contextual operational insights
Interpreting multiple operational signals
This separation helps keep critical operational calculations transparent while using AI where it adds the most value.


⸻


🗺️ Rajasthan Pilot
MEDRESQ AI is designed around a Rajasthan PHC pilot scenario.
The prototype demonstrates geographically distributed facilities and operational scenarios across Rajasthan, including:
PHC-level inventory
Regional demand patterns
Medicine transfer workflows
Desert/heatwave-related operational context
Network-level stock visibility
Why Rajasthan?
Rajasthan presents an interesting operational environment because healthcare logistics can be affected by:
Large geographic distances
Rural and distributed facilities
Seasonal variation
Extreme heat
Different local demand patterns
Logistics and replenishment lead times
The pilot provides a practical environment for testing the workflow before broader deployment.


⸻


🇮🇳 India-Scale Vision
The long-term vision is:
Rajasthan Pilot
↓
Multi-State Deployment
↓
India-Wide PHC Network
↓
Interoperable Health-Supply Intelligence 



The architecture can be adapted to different regions by changing facility, inventory, geography, language and operational datasets.


⸻


🌍 BRICS-Ready Vision
MEDRESQ AI is designed with multilingual and geographically adaptable healthcare operations in mind.
The future vision is to make the platform adaptable to diverse healthcare environments across BRICS countries.
Potential areas of adaptation include:
Multilingual interfaces
Local healthcare workflows
Local medicine catalogues
Regional geography
Local supply-chain rules
Different data standards
Human-in-the-loop governance
Important: MEDRESQ AI is currently presented as a Rajasthan pilot/prototype with an India-scale and BRICS-ready vision. It should not be interpreted as already deployed across BRICS countries.


⸻


🌐 Multilingual Design
The platform is intended to support multilingual interaction across the interface and AI/OCR/voice workflows.
Target language architecture includes:
🇮🇳 Hindi
🇬🇧 English
Hinglish / mixed-language input
Punjabi
Tamil
Telugu
Malayalam
The goal is not simply to translate the sidebar.
The intended architecture is end-to-end localisation, covering:
Navigation → Forms → Tables → Alerts → AI prompts → OCR → Voice → Reports
This is particularly important for frontline healthcare environments where English-only interfaces may create unnecessary friction.


⸻


📷 OCR & Voice Register Workflow
Many healthcare workflows still involve physical registers.
MEDRESQ AI demonstrates a digital workflow for converting register information into structured data.
Workflow
Physical Register
       ↓
Photo / Camera
       ↓
OCR Extraction
       ↓
Medicine / Quantity Matching
       ↓
Human Verification
       ↓
Ledger Commit
The voice workflow provides an additional interaction layer:
Voice Command
      ↓
Language Detection / Recognition
      ↓
Speech-to-Text
      ↓
Command Interpretation
      ↓
Human Verification
      ↓
Operational Action


⸻


🗺️ Network Intelligence
The Network Stock Map provides a geographic operational view of PHCs and health facilities.
A facility can be inspected for information such as:
Medicine risk
Available stock
Days of cover
Criticality
Operational status
Transfer possibilities
The objective is to move from:
“What is missing?”
to:
“Where is the risk, where is the available resource, and what operational response is possible?”


⸻


🔄 Medicine Transfer Workflow
MEDRESQ AI demonstrates a workflow for tracking:
Requirement
   ↓
Requisition
   ↓
Review
   ↓
Approval
   ↓
Dispatch
   ↓
Transit
   ↓
Delivery
   ↓
Receipt / Ledger
This provides greater visibility into medicine movement between facilities.


⸻


🛡️ Human-in-the-Loop Safety
MEDRESQ AI is designed as a decision-support platform.
The system does not intend to autonomously make clinical decisions.
Important actions can follow a workflow such as:
AI / System Signal
        ↓
Medical Officer Review
        ↓
Approval / Rejection
        ↓
Operational Action
        ↓
Audit Trail
This approach is intended to keep healthcare professionals involved in consequential decisions.


⸻


🧪 Prototype & Demo Data
The current demonstration uses synthetic / simulated operational data for showcasing the product workflow.
This allows the prototype to demonstrate:
Stock scenarios
Critical alerts
PHC transfers
Demand signals
Network mapping
OCR workflows
Staff records
Operational dashboards
without representing real patient or facility records.


⸻


🏗️ Technology
The project is developed as an AI-enabled web application prototype.
The repository should be updated with the exact technologies actually present in the source code.
For example:
Frontend
- React / Vite (if present in repository)
AI
- Google Gemini APIs (if configured in repository)
Data
- Local / simulated data
- SQLite or other storage only if present
Maps
- Mapping provider used by the implementation
Voice
- Browser / API speech recognition used by the implementation
Deployment
GOOGLE AI STUDIOS ,GEMINI AI,FIREBASE,GITHUB,VIRTEX,GOOGLE MAP,DATA.GOV.IN
