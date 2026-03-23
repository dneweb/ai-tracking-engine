
import { SignIn } from "@clerk/nextjs";
import { Sparkles, ShieldCheck, Zap, BrainCircuit } from "lucide-react";

export function generateStaticParams() {
  return [{ 'sign-in': [] }];
}

export default function SignInPage() {
  return (
    <div className="min-h-screen w-full flex bg-background relative overflow-hidden font-body">
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Left side - Premium Branding */}
      <div className="hidden lg:flex flex-1 flex-col justify-center px-12 lg:px-24 bg-[#0A0A0A] border-r border-white/[0.05] relative overflow-hidden">
        <div className="relative z-10 space-y-12">
          <div className="flex items-center gap-4 group cursor-default">
            <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-white/[0.03] border border-white/[0.1] flex items-center justify-center p-3 shadow-2xl group-hover:border-primary/50 transition-all duration-500">
               <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
               <BrainCircuit className="w-full h-full text-primary relative z-10" />
            </div>
            <div>
              <h1 className="text-foreground font-extrabold text-4xl tracking-tight leading-tight font-display">
                CommerciaX <span className="text-primary">AI</span>
              </h1>
              <p className="text-muted-foreground font-bold tracking-[0.3em] text-[10px] uppercase opacity-60">Intelligence Engine</p>
            </div>
          </div>
          
          <div className="space-y-6">
            <h2 className="text-5xl font-bold text-foreground leading-[1.1] tracking-tight font-display max-w-lg">
                Manifest organization <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">intelligence.</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-md leading-relaxed font-medium">
                The next generation of organizational knowledge synthesis. Secure, private, and exceptionally fast.
            </p>
          </div>
          
          <div className="grid grid-cols-1 gap-6">
            <div className="flex items-center gap-4 group/item">
              <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center text-primary group-hover/item:bg-primary/10 group-hover/item:border-primary/20 transition-all">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <p className="text-sm font-bold text-foreground uppercase tracking-widest">Enterprise Guard</p>
                <p className="text-xs font-medium text-muted-foreground">Military-grade encryption for all SOP assets.</p>
              </div>
            </div>
            <div className="flex items-center gap-4 group/item">
              <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center text-primary group-hover/item:bg-primary/10 group-hover/item:border-primary/20 transition-all">
                <Zap className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <p className="text-sm font-bold text-foreground uppercase tracking-widest">Instant Synthesis</p>
                <p className="text-xs font-medium text-muted-foreground">Sub-second neural retrieval across global documents.</p>
              </div>
            </div>
            <div className="flex items-center gap-4 group/item">
              <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center text-primary group-hover/item:bg-primary/10 group-hover/item:border-primary/20 transition-all">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <p className="text-sm font-bold text-foreground uppercase tracking-widest">Pattern Discovery</p>
                <p className="text-xs font-medium text-muted-foreground">Automated gap detection and cluster analysis.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Auth Component */}
      <div className="flex-1 flex items-center justify-center p-8 sm:px-12 relative z-10">
        <div className="w-full max-w-[440px]">
            <SignIn
                appearance={{
                    elements: {
                        rootBox: "w-full",
                        card: "bg-white/[0.02] backdrop-blur-3xl border border-white/[0.05] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] rounded-[2rem] w-full p-2 py-6",
                        headerTitle: "text-foreground text-2xl font-bold font-display tracking-tight",
                        headerSubtitle: "text-muted-foreground font-medium text-sm",
                        formFieldLabel: "text-muted-foreground font-bold text-[10px] uppercase tracking-widest mb-2",
                        formFieldInput: "bg-white/[0.03] border-white/[0.05] focus:border-primary/50 text-foreground placeholder:text-muted-foreground/30 focus:ring-4 focus:ring-primary/10 rounded-2xl py-3.5 transition-all font-medium",
                        footerActionLink: "text-primary hover:text-primary-hover focus:shadow-none font-bold text-xs uppercase tracking-widest",
                        formButtonPrimary: "bg-primary hover:bg-primary-hover text-white font-bold py-4 transition-all shadow-xl shadow-primary/20 rounded-2xl text-[10px] uppercase tracking-[0.2em]",
                        identityPreviewText: "text-foreground font-semibold",
                        identityPreviewEditButtonIcon: "text-muted-foreground hover:text-foreground transition-colors",
                        dividerLine: "bg-white/[0.05]",
                        dividerText: "text-muted-foreground text-[10px] font-bold uppercase tracking-[0.2em] bg-transparent px-4 py-2",
                        socialButtonsBlockButton: "border-white/[0.05] bg-white/[0.03] hover:bg-white/[0.06] text-foreground rounded-2xl transition-all h-12",
                        socialButtonsBlockButtonText: "text-foreground/80 font-bold text-[10px] uppercase tracking-widest",
                        socialButtonsBlockButtonArrow: "text-muted-foreground",
                        formFieldAction: "text-primary hover:text-primary-hover font-bold text-[10px] uppercase tracking-widest",
                    },
                    layout: {
                        socialButtonsPlacement: "bottom",
                        showOptionalFields: false,
                    }
                }}
            />
        </div>
      </div>
    </div>
  );
}
