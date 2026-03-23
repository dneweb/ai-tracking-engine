
import { SignUp } from "@clerk/nextjs";
import { ShieldCheck, BrainCircuit, Rocket } from "lucide-react";

export function generateStaticParams() {
  return [{ 'sign-up': [] }];
}

export default function SignUpPage() {
  return (
    <div className="min-h-screen w-full flex bg-background relative overflow-hidden font-body">
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-success/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Left Side - Visual Branding */}
      <div className="hidden lg:flex flex-1 relative flex-col justify-center px-12 xl:px-24 overflow-hidden">
        {/* Animated Grid Background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
        
        <div className="relative z-10 space-y-12">
          <div className="flex items-center gap-4 group">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20 shadow-[0_0_20px_rgba(var(--primary-rgb),0.1)] group-hover:scale-105 transition-transform duration-500">
              <BrainCircuit className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold font-display tracking-tight text-foreground">AI Tracking Engine</h1>
              <p className="text-primary/70 text-xs font-bold uppercase tracking-[0.3em]">Knowledge Synchronization</p>
            </div>
          </div>

          <div className="space-y-6 max-w-lg">
            <h2 className="text-5xl font-bold font-display leading-[1.1] tracking-tight text-foreground">
              Master your <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-primary-hover to-success animate-gradient-x">SOP Intelligence.</span>
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed font-medium">
              Join the elite teams using neural-guided tracking to eliminate intelligence gaps and ensure documentation precision.
            </p>
          </div>

          <div className="grid gap-6">
            {[
              { icon: ShieldCheck, title: "Zero-Trust Security", desc: "Enterprise-grade Clerk authentication protocol." },
              { icon: Rocket, title: "Rapid Onboarding", desc: "Deploy your intelligence engine in minutes, not days." }
            ].map((feature, i) => (
              <div key={i} className="flex gap-4 p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:border-white/10 transition-all hover:translate-x-1 duration-300">
                <div className="w-12 h-12 bg-white/[0.03] rounded-xl flex items-center justify-center border border-white/10 text-primary">
                  <feature.icon className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-foreground mb-1">{feature.title}</h4>
                  <p className="text-sm text-muted-foreground/80 font-medium">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Floating Credit Card Mockup or similar visual could go here */}
      </div>

      {/* Right Side - Auth Components */}
      <div className="flex-1 flex items-center justify-center p-8 relative z-20">
        <div className="w-full max-w-md">
          <div className="clerk-container-premium">
            <SignUp 
              appearance={{
                elements: {
                  rootBox: "w-full",
                  card: "bg-transparent",
                  socialButtonsBlockButton: "bg-white/[0.03] border-white/[0.05] hover:bg-white/[0.06] hover:border-white/10 text-foreground text-sm font-bold h-12 rounded-xl transition-all",
                  formButtonPrimary: "bg-primary hover:bg-primary-hover text-white text-sm font-bold h-12 rounded-xl shadow-lg shadow-primary/20 border-none transition-all",
                  formFieldInput: "bg-white/[0.02] border-white/[0.05] focus:border-primary/50 text-foreground rounded-xl h-12",
                  footerActionLink: "text-primary hover:text-primary-hover font-bold",
                  identityPreviewText: "text-foreground font-medium",
                  formFieldLabel: "text-muted-foreground font-bold text-[10px] uppercase tracking-widest",
                  dividerLine: "bg-white/[0.05]",
                  dividerText: "text-muted-foreground text-[10px] font-bold uppercase tracking-widest",
                  headerTitle: "text-foreground text-xl font-bold font-display",
                  headerSubtitle: "text-muted-foreground text-sm font-medium"
                }
              }}
              routing="path" 
              path="/sign-up" 
            />
          </div>
        </div>
      </div>
    </div>
  );
}
