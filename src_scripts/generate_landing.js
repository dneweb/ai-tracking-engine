const fs = require('fs');

const html = `
<nav class="fixed top-0 w-full z-50 bg-white/60 dark:bg-[#10131c]/60 backdrop-blur-md shadow-[0_20px_40px_rgba(0,0,0,0.12)]">
<div class="flex justify-between items-center px-8 py-4 max-w-7xl mx-auto">
<div class="text-2xl font-black text-slate-900 dark:text-white tracking-tighter font-['Epilogue']">
                KnowledgeEngine
            </div>
<div class="hidden md:flex items-center space-x-8">
<a class="font-['Epilogue'] tracking-tight font-bold text-[#5B4DFF] border-b-2 border-[#5B4DFF] pb-1 hover:text-[#5B4DFF] transition-colors duration-300" href="#">Features</a>
<a class="font-['Epilogue'] tracking-tight font-bold text-slate-600 dark:text-slate-400 hover:text-[#5B4DFF] transition-colors duration-300" href="#">SOPs</a>
<a class="font-['Epilogue'] tracking-tight font-bold text-slate-600 dark:text-slate-400 hover:text-[#5B4DFF] transition-colors duration-300" href="#">Pipeline</a>
<a class="font-['Epilogue'] tracking-tight font-bold text-slate-600 dark:text-slate-400 hover:text-[#5B4DFF] transition-colors duration-300" href="#">Pricing</a>
</div>
<div class="flex items-center space-x-4">
<button class="p-2 text-slate-600 dark:text-slate-400 hover:text-[#5B4DFF]">
<span class="material-symbols-outlined">light_mode</span>
</button>
<button class="bg-gradient-cta text-on-primary px-6 py-2.5 rounded-lg font-['Space+Grotesk'] font-bold text-sm uppercase tracking-widest scale-95 active:scale-100 transition-transform">
                    Request Demo
                </button>
</div>
</div>
</nav>
<main class="pt-24">
<!-- Hero Section -->
<section class="relative min-h-[921px] flex flex-col items-center justify-center px-6 overflow-hidden">
<div class="absolute inset-0 z-0">
<div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[120px]"></div>
<div class="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-tertiary/5 rounded-full blur-[100px]"></div>
</div>
<div class="relative z-10 max-w-5xl text-center space-y-8">
<div class="inline-flex items-center space-x-2 bg-surface-container-low px-4 py-1.5 rounded-full border border-outline-variant/20 mb-4">
<span class="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
<span class="text-xs font-label uppercase tracking-widest text-secondary">Neural Memory v4.2 Live</span>
</div>
<h1 class="text-5xl md:text-8xl font-headline font-black tracking-tighter leading-[0.9] text-on-surface">
                    Your Organization's <br/>
<span class="text-gradient">Neural Memory.</span>
</h1>
<p class="max-w-2xl mx-auto text-lg md:text-xl text-on-surface-variant font-body leading-relaxed">
                    Transform scattered documentation into a living, breathing knowledge ecosystem. KnowledgeEngine curates, indexes, and surfaces intelligence before you even ask.
                </p>
<div class="flex flex-col md:flex-row items-center justify-center gap-4 pt-6">
<button class="bg-gradient-cta text-on-primary px-8 py-4 rounded-xl font-label font-bold text-lg group overflow-hidden relative">
<span class="relative z-10">Start Mapping Intelligence</span>
</button>
<button class="px-8 py-4 rounded-xl font-label font-bold text-lg border border-outline-variant/30 hover:bg-surface-container-high transition-all">
                        Watch System Tour
                    </button>
</div>
</div>
<!-- Terminal Mockup -->
<div class="relative z-10 mt-20 w-full max-w-4xl mx-auto px-4">
<div class="bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-2xl overflow-hidden">
<div class="flex items-center justify-between px-4 py-3 bg-surface-container border-b border-outline-variant/20">
<div class="flex space-x-1.5">
<div class="w-2.5 h-2.5 rounded-full bg-error/40"></div>
<div class="w-2.5 h-2.5 rounded-full bg-tertiary/40"></div>
<div class="w-2.5 h-2.5 rounded-full bg-secondary/40"></div>
</div>
<div class="text-[10px] font-mono text-outline uppercase tracking-widest">ai-shell &mdash; interactive-query</div>
</div>
<div class="p-6 font-mono text-sm space-y-4">
<div class="flex space-x-3">
<span class="text-primary">user:</span>
<span class="text-on-surface">How do we handle off-site data encryption for Tier-3 clients?</span>
</div>
<div class="flex space-x-3 border-l-2 border-primary/30 pl-4 py-2 bg-surface-container-low/50">
<span class="text-secondary">engine:</span>
<span class="text-on-surface-variant">Scanning [SOP-SEC-2024]... According to Section 4.2, all Tier-3 data requires AES-256 at rest with hardware-backed KMS. Last updated by Sarah J. 14 days ago. <span class="animate-pulse">|</span></span>
</div>
</div>
</div>
</div>
</section>
<!-- Stats Marquee -->
<section class="py-20 bg-surface-container-lowest border-y border-outline-variant/10 overflow-hidden">
<div class="max-w-7xl mx-auto px-8">
<div class="grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
<div class="space-y-1">
<div class="text-4xl font-headline font-black text-on-surface">98.4<span class="text-primary">%</span></div>
<div class="text-[10px] font-label uppercase tracking-widest text-outline">Retrieval Accuracy</div>
</div>
<div class="space-y-1">
<div class="text-4xl font-headline font-black text-on-surface">12<span class="text-secondary">ms</span></div>
<div class="text-[10px] font-label uppercase tracking-widest text-outline">Latency Threshold</div>
</div>
<div class="space-y-1">
<div class="text-4xl font-headline font-black text-on-surface">500<span class="text-tertiary">M+</span></div>
<div class="text-[10px] font-label uppercase tracking-widest text-outline">Tokens Indexed</div>
</div>
<div class="space-y-1">
<div class="text-4xl font-headline font-black text-on-surface">2.4<span class="text-primary-fixed">x</span></div>
<div class="text-[10px] font-label uppercase tracking-widest text-outline">Onboarding Speed</div>
</div>
</div>
</div>
</section>
<!-- Bento Grid Features -->
<section class="py-32 px-8 max-w-7xl mx-auto">
<div class="mb-16 space-y-4">
<h2 class="text-4xl md:text-6xl font-headline font-black tracking-tight">Architected for <br/><span class="text-gradient">Logic.</span></h2>
</div>
<div class="grid grid-cols-1 md:grid-cols-12 gap-6 h-auto md:h-[800px]">
<!-- Large Card -->
<div class="md:col-span-8 group relative overflow-hidden rounded-3xl bg-surface-container p-10 flex flex-col justify-end transition-all hover:bg-surface-container-high">
<div class="absolute top-0 right-0 p-8">
<span class="material-symbols-outlined text-6xl text-primary/20 group-hover:text-primary transition-colors">neurology</span>
</div>
<div class="relative z-10 space-y-4 max-w-xl">
<div class="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary font-label text-xs uppercase tracking-widest">Core Engine</div>
<h3 class="text-3xl font-headline font-bold">Neural Knowledge Retrieval</h3>
<p class="text-on-surface-variant font-body">Our proprietary RAG (Retrieval-Augmented Generation) pipeline ensures that the AI only speaks from your verified data. No hallucinations, just architecture.</p>
</div>
<img class="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-20 group-hover:opacity-40 transition-opacity" data-alt="abstract artistic visualization of complex neural network data nodes glowing with purple and cyan light in dark space" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDQN2tl2wN_JyCJ_AaU4YaRrnVrmoRHnPVmyDsvTvwkeRrv3EE-l1kpqh-Mp_UaZPVHcqhtU_ViCcrnMdnPYaXLyXeuEqgoYpgFMLVCU-XSzjvYtPHbLU8Olkd05AIeVpUMRLwWFAsCFOhCbamm2CE97xpyJrpbVVWjw7j6eHzaj38n-QqG3nKVLc_GBFCD9-34oi9ZYDzc5ltdsS9YAXpWFIcTPMunR3IIbFTOQjh3J87p-eJi2kYmbE8B0CbgsBiWDJU7382-9b3e"/>
</div>
<!-- Tall Card -->
<div class="md:col-span-4 group relative overflow-hidden rounded-3xl bg-surface-container p-10 flex flex-col transition-all hover:bg-surface-container-high border border-outline-variant/10">
<div class="flex flex-col h-full">
<div class="flex items-center justify-between mb-6">
<div class="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center">
<span class="material-symbols-outlined text-2xl text-secondary">analytics</span>
</div>
<div class="flex space-x-1">
<span class="w-1.5 h-1.5 rounded-full bg-secondary animate-ping"></span>
<span class="text-[10px] font-label text-secondary uppercase tracking-widest">Live Audit</span>
</div>
</div>
<div class="relative flex-1 flex flex-col items-center justify-center py-4">
<!-- Radar Chart Container -->
<div class="relative w-48 h-48 md:w-56 md:h-56 group/radar">
<!-- Scanning Beam -->
<div class="absolute inset-0 z-10 pointer-events-none rounded-full border-r-2 border-primary/40 animate-[spin_4s_linear_infinite]" style="background: conic-gradient(from 0deg, transparent 90%, rgba(91, 77, 255, 0.1) 100%);"></div>
<svg class="w-full h-full transform -rotate-90 overflow-visible" viewbox="0 0 100 100">
<!-- Radar Grids -->
<circle class="text-outline/10" cx="50" cy="50" fill="none" r="45" stroke="currentColor" stroke-width="0.5"></circle>
<circle class="text-outline/10" cx="50" cy="50" fill="none" r="30" stroke="currentColor" stroke-width="0.5"></circle>
<circle class="text-outline/10" cx="50" cy="50" fill="none" r="15" stroke="currentColor" stroke-width="0.5"></circle>
<!-- Axes -->
<line class="text-outline/20" stroke="currentColor" stroke-width="0.5" x1="50" x2="50" y1="50" y2="5"></line>
<line class="text-outline/20" stroke="currentColor" stroke-width="0.5" x1="50" x2="95" y1="50" y2="50"></line>
<line class="text-outline/20" stroke="currentColor" stroke-width="0.5" x1="50" x2="50" y1="50" y2="95"></line>
<line class="text-outline/20" stroke="currentColor" stroke-width="0.5" x1="50" x2="5" y1="50" y2="50"></line>
<!-- Data Fill (Liquid Effect Placeholder) -->
<polygon class="opacity-40 group-hover/radar:opacity-60 transition-opacity" fill="url(#liquidGradient)" points="50,15 80,50 50,85 20,50"></polygon>
<!-- High Gap Pings -->
<circle class="animate-pulse" cx="80" cy="50" fill="#5B4DFF" r="1.5"></circle>
<circle class="opacity-20 animate-ping" cx="80" cy="50" fill="#5B4DFF" r="4"></circle>
<defs>
<lineargradient id="liquidGradient" x1="0%" x2="100%" y1="0%" y2="100%">
<stop offset="0%" stop-color="#5B4DFF"></stop>
<stop offset="100%" stop-color="#00DAF3"></stop>
</lineargradient>
</defs>
</svg>
<!-- Labels with hover triggers -->
<div class="absolute -top-4 left-1/2 -translate-x-1/2 group-hover/radar:animate-pulse text-[10px] font-label text-outline uppercase">HR</div>
<div class="absolute top-1/2 -right-6 -translate-y-1/2 group-hover/radar:animate-pulse text-[10px] font-label text-outline uppercase">IT</div>
<div class="absolute -bottom-4 left-1/2 -translate-x-1/2 group-hover/radar:animate-pulse text-[10px] font-label text-outline uppercase">Compliance</div>
<div class="absolute top-1/2 -left-12 -translate-y-1/2 group-hover/radar:animate-pulse text-[10px] font-label text-outline uppercase">Engineering</div>
</div>
</div>
<div class="mt-auto space-y-4">
<h3 class="text-2xl font-headline font-bold">Gap Analysis</h3>
<div class="bg-surface-container-lowest/50 rounded-xl p-4 border border-outline-variant/10">
<div class="flex items-center justify-between mb-2">
<span class="text-xs font-label text-outline uppercase tracking-tighter">Blind Spot Report</span>
<span class="text-[10px] font-mono text-primary">Detailed View</span>
</div>
<div class="space-y-2">
<div class="group/item cursor-pointer flex items-center justify-between p-2 rounded-lg hover:bg-primary/5 transition-colors">
<div class="flex items-center space-x-2">
<div class="w-1.5 h-1.5 rounded-full bg-primary"></div>
<span class="text-xs text-on-surface-variant group-hover/item:text-on-surface">Onboarding SOP</span>
</div>
<span class="text-[10px] font-mono text-outline">42% Gap</span>
<!-- Tooltip Style Popover (Simplified via CSS peer/hover) -->
<div class="hidden group-hover/item:block absolute bottom-12 right-10 bg-surface-bright p-2 rounded shadow-xl border border-outline-variant/30 z-20 w-32">
<div class="text-[8px] text-outline uppercase">Last Updated</div>
<div class="text-[10px] text-on-surface">184 days ago</div>
</div>
</div>
<div class="group/item cursor-pointer flex items-center justify-between p-2 rounded-lg hover:bg-secondary/5 transition-colors">
<div class="flex items-center space-x-2">
<div class="w-1.5 h-1.5 rounded-full bg-secondary"></div>
<span class="text-xs text-on-surface-variant group-hover/item:text-on-surface">Security V3</span>
</div>
<span class="text-[10px] font-mono text-outline">12% Gap</span>
</div>
</div>
</div>
<div class="pt-4 border-t border-outline-variant/20">
<div class="flex items-center justify-between text-sm">
<span class="font-label text-outline uppercase tracking-widest">Total Coverage</span>
<span class="font-mono text-secondary">74% Complete</span>
</div>
<div class="mt-2 h-1 w-full bg-surface-container-lowest rounded-full overflow-hidden">
<div class="h-full bg-gradient-to-r from-primary to-secondary w-3/4"></div>
</div>
</div>
</div>
</div>
</div>
<!-- Small Card 1 -->
<div class="md:col-span-4 group relative overflow-hidden rounded-3xl bg-surface-container p-10 flex flex-col transition-all hover:bg-surface-container-high border border-outline-variant/10">
<div class="flex flex-col h-full">
<div class="flex items-center justify-between mb-6">
<div class="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center">
<span class="material-symbols-outlined text-2xl text-secondary">analytics</span>
</div>
<div class="flex space-x-1">
<span class="w-1.5 h-1.5 rounded-full bg-secondary animate-ping"></span>
<span class="text-[10px] font-label text-secondary uppercase tracking-widest">Live Audit</span>
</div>
</div>
<div class="relative flex-1 flex flex-col items-center justify-center py-4">
<!-- Radar Chart Container -->
<div class="relative w-48 h-48 md:w-56 md:h-56 group/radar">
<!-- Scanning Beam -->
<div class="absolute inset-0 z-10 pointer-events-none rounded-full border-r-2 border-primary/40 animate-[spin_4s_linear_infinite]" style="background: conic-gradient(from 0deg, transparent 90%, rgba(91, 77, 255, 0.1) 100%);"></div>
<svg class="w-full h-full transform -rotate-90 overflow-visible" viewbox="0 0 100 100">
<!-- Radar Grids -->
<circle class="text-outline/10" cx="50" cy="50" fill="none" r="45" stroke="currentColor" stroke-width="0.5"></circle>
<circle class="text-outline/10" cx="50" cy="50" fill="none" r="30" stroke="currentColor" stroke-width="0.5"></circle>
<circle class="text-outline/10" cx="50" cy="50" fill="none" r="15" stroke="currentColor" stroke-width="0.5"></circle>
<!-- Axes -->
<line class="text-outline/20" stroke="currentColor" stroke-width="0.5" x1="50" x2="50" y1="50" y2="5"></line>
<line class="text-outline/20" stroke="currentColor" stroke-width="0.5" x1="50" x2="95" y1="50" y2="50"></line>
<line class="text-outline/20" stroke="currentColor" stroke-width="0.5" x1="50" x2="50" y1="50" y2="95"></line>
<line class="text-outline/20" stroke="currentColor" stroke-width="0.5" x1="50" x2="5" y1="50" y2="50"></line>
<!-- Data Fill (Liquid Effect Placeholder) -->
<polygon class="opacity-40 group-hover/radar:opacity-60 transition-opacity" fill="url(#liquidGradient)" points="50,15 80,50 50,85 20,50"></polygon>
<!-- High Gap Pings -->
<circle class="animate-pulse" cx="80" cy="50" fill="#5B4DFF" r="1.5"></circle>
<circle class="opacity-20 animate-ping" cx="80" cy="50" fill="#5B4DFF" r="4"></circle>
<defs>
<lineargradient id="liquidGradient" x1="0%" x2="100%" y1="0%" y2="100%">
<stop offset="0%" stop-color="#5B4DFF"></stop>
<stop offset="100%" stop-color="#00DAF3"></stop>
</lineargradient>
</defs>
</svg>
<!-- Labels with hover triggers -->
<div class="absolute -top-4 left-1/2 -translate-x-1/2 group-hover/radar:animate-pulse text-[10px] font-label text-outline uppercase">HR</div>
<div class="absolute top-1/2 -right-6 -translate-y-1/2 group-hover/radar:animate-pulse text-[10px] font-label text-outline uppercase">IT</div>
<div class="absolute -bottom-4 left-1/2 -translate-x-1/2 group-hover/radar:animate-pulse text-[10px] font-label text-outline uppercase">Compliance</div>
<div class="absolute top-1/2 -left-12 -translate-y-1/2 group-hover/radar:animate-pulse text-[10px] font-label text-outline uppercase">Engineering</div>
</div>
</div>
<div class="mt-auto space-y-4">
<h3 class="text-2xl font-headline font-bold">Gap Analysis</h3>
<div class="bg-surface-container-lowest/50 rounded-xl p-4 border border-outline-variant/10">
<div class="flex items-center justify-between mb-2">
<span class="text-xs font-label text-outline uppercase tracking-tighter">Blind Spot Report</span>
<span class="text-[10px] font-mono text-primary">Detailed View</span>
</div>
<div class="space-y-2">
<div class="group/item cursor-pointer flex items-center justify-between p-2 rounded-lg hover:bg-primary/5 transition-colors">
<div class="flex items-center space-x-2">
<div class="w-1.5 h-1.5 rounded-full bg-primary"></div>
<span class="text-xs text-on-surface-variant group-hover/item:text-on-surface">Onboarding SOP</span>
</div>
<span class="text-[10px] font-mono text-outline">42% Gap</span>
<!-- Tooltip Style Popover (Simplified via CSS peer/hover) -->
<div class="hidden group-hover/item:block absolute bottom-12 right-10 bg-surface-bright p-2 rounded shadow-xl border border-outline-variant/30 z-20 w-32">
<div class="text-[8px] text-outline uppercase">Last Updated</div>
<div class="text-[10px] text-on-surface">184 days ago</div>
</div>
</div>
<div class="group/item cursor-pointer flex items-center justify-between p-2 rounded-lg hover:bg-secondary/5 transition-colors">
<div class="flex items-center space-x-2">
<div class="w-1.5 h-1.5 rounded-full bg-secondary"></div>
<span class="text-xs text-on-surface-variant group-hover/item:text-on-surface">Security V3</span>
</div>
<span class="text-[10px] font-mono text-outline">12% Gap</span>
</div>
</div>
</div>
<div class="pt-4 border-t border-outline-variant/20">
<div class="flex items-center justify-between text-sm">
<span class="font-label text-outline uppercase tracking-widest">Total Coverage</span>
<span class="font-mono text-secondary">74% Complete</span>
</div>
<div class="mt-2 h-1 w-full bg-surface-container-lowest rounded-full overflow-hidden">
<div class="h-full bg-gradient-to-r from-primary to-secondary w-3/4"></div>
</div>
</div>
</div>
</div>
</div>
<!-- Wide Card -->
<div class="md:col-span-8 group relative overflow-hidden rounded-3xl bg-surface-container p-10 flex items-center transition-all hover:bg-surface-container-high border border-outline-variant/10">
<div class="flex-1 space-y-4">
<h3 class="text-3xl font-headline font-bold">Automated Ingestion</h3>
<p class="text-on-surface-variant font-body">Connect Slack, Notion, GitHub, and local PDFs. The engine watches changes in real-time.</p>
</div>
<div class="hidden md:block w-48 h-32 bg-surface-container-lowest rounded-xl border border-outline-variant/20 p-4 space-y-2">
<div class="h-2 w-full bg-primary/20 rounded"></div>
<div class="h-2 w-3/4 bg-primary/20 rounded"></div>
<div class="h-2 w-5/6 bg-secondary/20 rounded"></div>
</div>
</div>
</div>
</section>
<!-- Product Preview (3D Dashboard) -->
<section class="py-32 bg-surface-container-low/30 relative">
<div class="max-w-7xl mx-auto px-8">
<div class="text-center mb-20 space-y-4">
<h2 class="text-4xl md:text-6xl font-headline font-black tracking-tight">Curation <span class="text-gradient">Redefined.</span></h2>
</div>
<div class="relative group">
<div class="absolute -inset-1 bg-gradient-cta opacity-20 blur-3xl rounded-[3rem] transition duration-1000 group-hover:opacity-30"></div>
<div class="relative bg-surface rounded-[2rem] border border-outline-variant/30 shadow-2xl overflow-hidden">
<img class="w-full h-auto opacity-90" data-alt="professional data analytics dashboard interface with glowing charts and metrics in dark blue aesthetic" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDpgA1nvetM_UKTyBALw-Y1I7tOgT__o7ZOH8vwN5HxFFuEveHy67sxyoCLYbXZ5qYaf4wyTXCIFE2a42dgk5LQENOA4je9LYmoXMcu8_JGCcW1b5e4KCGAmo21qa4Wu8THfsamqk1nKlDdizc1bhf7QhT0bQwewx8AIUku4ueIfBHc6LBNlWgbBM02KXhsXB4zS_-4dgSM554h5d07OA2zYKLdC1cmzBMTvb8tt6cTYUi_DK5sSIBuMQUlh3HiAF1M-nPX1qx7W0lW"/>
<!-- Floating Annotation Chips -->
<div class="absolute top-1/4 left-1/4 bg-surface-container-highest/90 backdrop-blur-md p-4 rounded-xl border border-primary/30 shadow-lg animate-bounce" style="animation-duration: 4s;">
<div class="flex items-center space-x-2">
<span class="material-symbols-outlined text-primary text-sm">auto_awesome</span>
<span class="text-xs font-label font-bold text-on-surface">Insight: SOP Outdated</span>
</div>
</div>
<div class="absolute bottom-1/3 right-1/4 bg-surface-container-highest/90 backdrop-blur-md p-4 rounded-xl border border-secondary/30 shadow-lg animate-bounce" style="animation-duration: 5s;">
<div class="flex items-center space-x-2">
<span class="material-symbols-outlined text-secondary text-sm">verified</span>
<span class="text-xs font-label font-bold text-on-surface">99% Confidence</span>
</div>
</div>
</div>
</div>
</div>
</section>
<!-- Pricing Section -->
<section class="py-32 px-8 max-w-7xl mx-auto">
<div class="text-center mb-20">
<h2 class="text-4xl md:text-6xl font-headline font-black tracking-tight">Predictable <span class="text-gradient">Scale.</span></h2>
</div>
<div class="grid grid-cols-1 md:grid-cols-3 gap-8">
<!-- Starter -->
<div class="bg-surface-container-low p-10 rounded-3xl border border-outline-variant/10 flex flex-col">
<div class="mb-8">
<div class="font-label text-outline uppercase tracking-widest mb-2">Starter</div>
<div class="text-4xl font-headline font-black">$499<span class="text-lg font-normal text-outline">/mo</span></div>
</div>
<ul class="space-y-4 mb-12 flex-1">
<li class="flex items-center space-x-3 text-sm text-on-surface-variant">
<span class="material-symbols-outlined text-primary text-lg">check_circle</span>
<span>Up to 500 Documents</span>
</li>
<li class="flex items-center space-x-3 text-sm text-on-surface-variant">
<span class="material-symbols-outlined text-primary text-lg">check_circle</span>
<span>10 Team Members</span>
</li>
<li class="flex items-center space-x-3 text-sm text-on-surface-variant">
<span class="material-symbols-outlined text-primary text-lg">check_circle</span>
<span>Standard Connectors</span>
</li>
</ul>
<button class="w-full py-4 rounded-xl font-label font-bold border border-outline-variant hover:bg-surface-container-high transition-all">Begin Ingestion</button>
</div>
<!-- Growth -->
<div class="bg-surface-container-highest p-10 rounded-3xl border-2 border-primary shadow-[0_0_40px_rgba(196,192,255,0.1)] relative flex flex-col scale-105">
<div class="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-on-primary px-4 py-1 rounded-full text-[10px] font-label font-bold uppercase tracking-widest">Recommended</div>
<div class="mb-8">
<div class="font-label text-primary uppercase tracking-widest mb-2">Growth</div>
<div class="text-4xl font-headline font-black">$1,299<span class="text-lg font-normal text-on-surface-variant">/mo</span></div>
</div>
<ul class="space-y-4 mb-12 flex-1">
<li class="flex items-center space-x-3 text-sm text-on-surface">
<span class="material-symbols-outlined text-primary text-lg">check_circle</span>
<span>Unlimited Documents</span>
</li>
<li class="flex items-center space-x-3 text-sm text-on-surface">
<span class="material-symbols-outlined text-primary text-lg">check_circle</span>
<span>Enterprise Connectors</span>
</li>
<li class="flex items-center space-x-3 text-sm text-on-surface">
<span class="material-symbols-outlined text-primary text-lg">check_circle</span>
<span>Real-time Gap Analysis</span>
</li>
<li class="flex items-center space-x-3 text-sm text-on-surface">
<span class="material-symbols-outlined text-primary text-lg">check_circle</span>
<span>Dedicated AI Support</span>
</li>
</ul>
<button class="w-full py-4 rounded-xl font-label font-bold bg-gradient-cta text-on-primary">Scale Intelligence</button>
</div>
<!-- Enterprise -->
<div class="bg-surface-container-low p-10 rounded-3xl border border-outline-variant/10 flex flex-col">
<div class="mb-8">
<div class="font-label text-outline uppercase tracking-widest mb-2">Enterprise</div>
<div class="text-4xl font-headline font-black">Custom</div>
</div>
<p class="text-sm text-on-surface-variant mb-12 font-body leading-relaxed">Dedicated clusters, custom fine-tuning, and white-glove onboarding for high-compliance organizations.</p>
<button class="w-full mt-auto py-4 rounded-xl font-label font-bold border border-outline-variant hover:bg-surface-container-high transition-all">Talk to Strategy</button>
</div>
</div>
</section>
<!-- Final CTA -->
<section class="py-32 px-8">
<div class="max-w-5xl mx-auto rounded-[3rem] bg-gradient-cta p-12 md:p-24 text-center space-y-10 relative overflow-hidden">
<div class="absolute inset-0 opacity-20" style="background-image: radial-gradient(circle, #fff 1px, transparent 1px); background-size: 30px 30px;"></div>
<div class="relative z-10 space-y-6">
<h2 class="text-4xl md:text-7xl font-headline font-black text-on-primary tracking-tight">Ready to curate <br/>your intelligence?</h2>
<p class="text-on-primary/80 max-w-xl mx-auto text-lg font-body">Join the next generation of knowledge-first organizations. Deploy your engine in minutes.</p>
<div class="pt-6">
<Link href="/sign-in" className="bg-surface text-on-surface px-12 py-5 rounded-2xl font-headline font-bold text-xl hover:scale-105 transition-transform inline-block">
                            Request Demo Access
                        </Link>
</div>
</div>
</div>
</section>
</main>
<!-- Footer -->
<footer class="bg-slate-50 dark:bg-[#0b0e17] w-full py-12 px-8">
<div class="grid grid-cols-1 md:grid-cols-4 gap-8 max-w-7xl mx-auto border-t border-slate-200 dark:border-slate-800/20 pt-12">
<div class="space-y-6">
<div class="text-xl font-bold text-slate-900 dark:text-white font-['Epilogue'] tracking-tighter">KnowledgeEngine</div>
<p class="text-slate-500 text-sm font-body leading-relaxed">Building the architectural foundation for the age of autonomous knowledge management.</p>
</div>
<div class="space-y-4">
<div class="font-['Manrope'] text-sm uppercase tracking-widest text-[#5B4DFF]">Product</div>
<ul class="space-y-2">
<li><a class="text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all text-sm" href="#">Documentation</a></li>
<li><a class="text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all text-sm" href="#">Status</a></li>
<li><a class="text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all text-sm" href="#">Pipeline</a></li>
</ul>
</div>
<div class="space-y-4">
<div class="font-['Manrope'] text-sm uppercase tracking-widest text-[#5B4DFF]">Company</div>
<ul class="space-y-2">
<li><a class="text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all text-sm" href="#">About</a></li>
<li><a class="text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all text-sm" href="#">Careers</a></li>
<li><a class="text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all text-sm" href="#">Security</a></li>
</ul>
</div>
<div class="space-y-4">
<div class="font-['Manrope'] text-sm uppercase tracking-widest text-[#5B4DFF]">Legal</div>
<ul class="space-y-2">
<li><a class="text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all text-sm" href="#">Privacy Policy</a></li>
<li><a class="text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all text-sm" href="#">Terms of Service</a></li>
</ul>
</div>
</div>
<div class="max-w-7xl mx-auto mt-20 pt-8 border-t border-outline-variant/10 flex flex-col md:flex-row justify-between items-center text-xs font-label tracking-widest text-slate-500">
<div>© 2024 KnowledgeEngine AI. Architecting Intelligence.</div>
<div class="flex space-x-6 mt-4 md:mt-0">
<a class="hover:text-white" href="#">Twitter</a>
<a class="hover:text-white" href="#">LinkedIn</a>
<a class="hover:text-white" href="#">GitHub</a>
</div>
</div>
</footer>
</div>
`;

function transformHTML(htmlStr) {
  return htmlStr
    .replace(/class=/g, 'className=')
    .replace(/viewbox=/g, 'viewBox=')
    .replace(/stroke-width=/g, 'strokeWidth=')
    .replace(/stop-color=/g, 'stopColor=')
    .replace(/<img([^>]*)>/g, '<img$1 />')
    .replace(/<br>/g, '<br />')
    .replace(/style="([^"]*)"/g, (match, p1) => {
      const parts = p1.split(';').filter(part => part.trim() !== '');
      const obj = parts.map(part => {
        const [key, value] = part.split(':').map(str => str.trim());
        const camelKey = key.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
        return \`\${camelKey}: "\${value}"\`;
      }).join(', ');
      return \`style={{\${obj}}}\`;
    });
}

const customStyles = `
/* Landing Custom Base Styles */
@theme {
  --color-surface-container-low: #181b25;
  --color-surface-container: #1c1f29;
  --color-surface: #10131c;
  --color-surface-bright: #363943;
  --color-primary: #c4c0ff;
  --color-on-primary: #2000a4;
  --color-surface-dim: #10131c;
  --color-on-secondary: #00363d;
  --color-on-tertiary: #442c00;
  --color-on-primary-fixed: #110068;
  --color-on-primary-fixed-variant: #3311dc;
  --color-on-background: #e0e2ef;
  --color-on-surface-variant: #c7c4d9;
  --color-on-secondary-container: #00616d;
  --color-on-secondary-fixed: #001f24;
  --color-inverse-primary: #4d3cf2;
  --color-on-primary-container: #efebff;
  --color-secondary: #bdf4ff;
  --color-tertiary-container: #916200;
  --color-on-tertiary-container: #ffead1;
  --color-tertiary-fixed-dim: #ffba44;
  --color-secondary-fixed-dim: #00daf3;
  --color-surface-container-highest: #32343f;
  --color-on-error-container: #ffdad6;
  --color-primary-fixed: #e3dfff;
  --color-on-error: #690005;
  --color-primary-container: #5b4dff;
  --color-on-surface: #e0e2ef;
  --color-primary-fixed-dim: #c4c0ff;
  --color-inverse-surface: #e0e2ef;
  --color-secondary-container: #00e3fd;
  --color-background: #10131c;
  --color-outline-variant: #464556;
  --color-outline: #918fa2;
  --color-error-container: #93000a;
  --color-surface-container-lowest: #0b0e17;
  --color-tertiary-fixed: #ffddaf;
  --color-on-tertiary-fixed: #281800;
  --color-inverse-on-surface: #2d303a;
  --color-secondary-fixed: #9cf0ff;
  --color-error: #ffb4ab;
  --color-surface-container-high: #272a34;
  --color-on-secondary-fixed-variant: #004f58;
  --color-surface-tint: #c4c0ff;
  --color-surface-variant: #32343f;
  --color-on-tertiary-fixed-variant: #614000;
  --color-tertiary: #ffba44;

  --font-headline: "Epilogue", sans-serif;
  --font-body: "Manrope", sans-serif;
  --font-label: "Space Grotesk", sans-serif;
  --font-mono: "JetBrains Mono", monospace;
}

.material-symbols-outlined {
    font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
}
.glass-card {
    background: rgba(24, 27, 37, 0.7);
    backdrop-filter: blur(20px);
}
.text-gradient {
    background: linear-gradient(135deg, #c4c0ff 0%, #5b4dff 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}
.bg-gradient-cta {
    background: linear-gradient(135deg, #c4c0ff 0%, #5b4dff 100%);
}
.no-scrollbar::-webkit-scrollbar { display: none; }
`;

const reactComponent = `import Link from 'next/link';
import './landing-custom.css';

export function LandingPage() {
  return (
    <div className="bg-surface text-on-surface selection:bg-primary selection:text-on-primary min-h-screen">
      ${transformHTML(html)}
    </div>
  );
}

export default LandingPage;
`;

fs.writeFileSync('../frontend/src/app/landing/LandingPage.tsx', reactComponent);
fs.writeFileSync('../frontend/src/app/landing/landing-custom.css', customStyles);

// Prepend Google Fonts to global head or Layout
const layoutPath = '../frontend/src/app/layout.tsx';
let layoutSource = fs.readFileSync(layoutPath, 'utf8');

const fontsToLoad = \`
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
  <link href="https://fonts.googleapis.com/css2?family=Epilogue:wght@400;700;800;900&family=Manrope:wght@400;500;600&family=Space+Grotesk:wght@300;500;700&family=JetBrains+Mono&display=swap" rel="stylesheet" />
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
\`;

if (!layoutSource.includes('Epilogue')) {
  layoutSource = layoutSource.replace('<head>', '<head>\\n' + fontsToLoad);
  fs.writeFileSync(layoutPath, layoutSource);
}

console.log("Successfully generated components and styles.");
