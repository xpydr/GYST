import { AuthButton } from "@/components/auth-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { CopyrightYear } from "@/components/copyright-year";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Suspense } from "react";
import {
  Calendar,
  Clock,
  Zap,
  Shield,
  BarChart3,
  Sparkles,
  ArrowRight,
  CheckCircle2
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white overflow-hidden relative">
      {/* Animated Cyber Grid Background */}
      <div className="fixed inset-0 cyber-grid opacity-30 pointer-events-none" />

      {/* Floating Neon Orbs - Reduced blur for better performance */}
      <div className="fixed top-20 left-10 w-64 h-64 bg-cyan-500/15 rounded-full blur-2xl float-animation pointer-events-none" />
      <div className="fixed bottom-20 right-10 w-96 h-96 bg-pink-500/15 rounded-full blur-2xl float-animation pointer-events-none" style={{ animationDelay: '2s' }} />
      <div className="fixed top-1/2 left-1/3 w-48 h-48 bg-cyan-500/10 rounded-full blur-xl float-animation pointer-events-none" style={{ animationDelay: '4s' }} />

      {/* Main Content */}
      <main className="relative z-10">
        {/* Navigation */}
        <nav className="w-full flex justify-center border-b border-cyan-500/20 h-16 backdrop-blur-sm bg-black/50">
          <div className="w-full max-w-7xl flex justify-between items-center p-3 px-5 text-sm">
            <div className="flex gap-5 items-center">
              <Link href={"/"} className="text-2xl font-bold neon-cyan pulse-neon">
                GYST
              </Link>
            </div>
            <Suspense>
              <AuthButton />
            </Suspense>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="relative min-h-[90vh] flex flex-col items-center justify-center px-4 py-20">
          <div className="text-center max-w-5xl mx-auto space-y-8">
            {/* Main Heading */}
            <h1 className="text-6xl md:text-8xl font-bold mb-6 relative">
              <span className="neon-cyan">FUTURE</span>{" "}
              <span className="neon-pink">OF</span>{" "}
              <span className="neon-cyan">PRODUCTIVITY</span>
            </h1>

            {/* Subtitle */}
            <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
              Experience the next generation of time management.
              <span className="text-cyan-400"> Cyberpunk-powered</span> productivity
              that transforms how you work, plan, and achieve.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-12">
              <Button
                asChild
                size="lg"
                className="bg-linear-to-r from-cyan-500 to-cyan-600 text-black font-bold text-lg px-8 py-6 glow-cyan hover:from-cyan-400 hover:to-cyan-500 transition-all duration-300 scan-line"
              >
                <Link href="/auth/sign-up" className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Start Your Journey
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </Button>

              <Button
                asChild
                variant="outline"
                size="lg"
                className="border-2 border-pink-500 text-pink-400 font-bold text-lg px-8 py-6 glow-pink hover:bg-pink-500/10 transition-all duration-300"
              >
                <Link href="/home" className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Explore Features
                </Link>
              </Button>
            </div>
          </div>

          {/* Animated Scan Line Effect */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-linear-to-r from-transparent via-cyan-500 to-transparent scan-line" />
        </section>

        {/* Features Section */}
        <section className="relative py-20 px-4 bg-linear-to-b from-black via-black to-black/95">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                <span className="neon-cyan">POWERED BY</span>{" "}
                <span className="neon-pink">INNOVATION</span>
              </h2>
              <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                Cutting-edge features designed for the modern professional
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="group relative p-6 border border-cyan-500/30 bg-black/50 backdrop-blur-sm hover:border-cyan-500 hover:glow-cyan transition-all duration-300">
                <div className="absolute inset-0 bg-linear-to-br from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <Calendar className="w-12 h-12 text-cyan-400 mb-4 group-hover:scale-110 transition-transform duration-300" />
                <h3 className="text-2xl font-bold text-cyan-400 mb-3">Smart Calendar</h3>
                <p className="text-gray-300 leading-relaxed">
                  Intelligent time blocking with AI-powered scheduling that adapts to your workflow and maximizes productivity.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="group relative p-6 border border-pink-500/30 bg-black/50 backdrop-blur-sm hover:border-pink-500 hover:glow-pink transition-all duration-300">
                <div className="absolute inset-0 bg-linear-to-br from-pink-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <Clock className="w-12 h-12 text-pink-400 mb-4 group-hover:scale-110 transition-transform duration-300" />
                <h3 className="text-2xl font-bold text-pink-400 mb-3">Time Blocking</h3>
                <p className="text-gray-300 leading-relaxed">
                  Advanced time management with visual blocks, drag-and-drop scheduling, and real-time synchronization.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="group relative p-6 border border-cyan-500/30 bg-black/50 backdrop-blur-sm hover:border-cyan-500 hover:glow-cyan transition-all duration-300">
                <div className="absolute inset-0 bg-linear-to-br from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <Zap className="w-12 h-12 text-cyan-400 mb-4 group-hover:scale-110 transition-transform duration-300" />
                <h3 className="text-2xl font-bold text-cyan-400 mb-3">Lightning Fast</h3>
                <p className="text-gray-300 leading-relaxed">
                  Built for speed with instant updates, real-time collaboration, and seamless cross-device synchronization.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="group relative p-6 border border-pink-500/30 bg-black/50 backdrop-blur-sm hover:border-pink-500 hover:glow-pink transition-all duration-300">
                <div className="absolute inset-0 bg-linear-to-br from-pink-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <Shield className="w-12 h-12 text-pink-400 mb-4 group-hover:scale-110 transition-transform duration-300" />
                <h3 className="text-2xl font-bold text-pink-400 mb-3">Secure & Private</h3>
                <p className="text-gray-300 leading-relaxed">
                  Enterprise-grade security with end-to-end encryption, keeping your data safe and your privacy protected.
                </p>
              </div>

              {/* Feature 5 */}
              <div className="group relative p-6 border border-cyan-500/30 bg-black/50 backdrop-blur-sm hover:border-cyan-500 hover:glow-cyan transition-all duration-300">
                <div className="absolute inset-0 bg-linear-to-br from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <BarChart3 className="w-12 h-12 text-cyan-400 mb-4 group-hover:scale-110 transition-transform duration-300" />
                <h3 className="text-2xl font-bold text-cyan-400 mb-3">Analytics Dashboard</h3>
                <p className="text-gray-300 leading-relaxed">
                  Deep insights into your productivity patterns with beautiful visualizations and actionable recommendations.
                </p>
              </div>

              {/* Feature 6 */}
              <div className="group relative p-6 border border-pink-500/30 bg-black/50 backdrop-blur-sm hover:border-pink-500 hover:glow-pink transition-all duration-300">
                <div className="absolute inset-0 bg-linear-to-br from-pink-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <Sparkles className="w-12 h-12 text-pink-400 mb-4 group-hover:scale-110 transition-transform duration-300" />
                <h3 className="text-2xl font-bold text-pink-400 mb-3">AI Assistant</h3>
                <p className="text-gray-300 leading-relaxed">
                  Intelligent automation that learns your habits and optimizes your schedule for peak performance.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="relative py-20 px-4 border-t border-cyan-500/20">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                <span className="neon-pink">WHY</span>{" "}
                <span className="neon-cyan">CHOOSE GYST?</span>
              </h2>
            </div>

            <div className="space-y-6">
              {[
                "Revolutionary time blocking technology that adapts to your schedule",
                "Beautiful Cyberpunk interface that makes productivity enjoyable",
                "Seamless integration with your existing calendar and tools",
                "Real-time collaboration features for teams",
                "Advanced analytics to track and improve your productivity",
                "Cross-platform support - access anywhere, anytime"
              ].map((benefit, index) => (
                <div
                  key={index}
                  className="flex items-start gap-4 p-4 border border-cyan-500/20 bg-black/30 hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all duration-300"
                >
                  <CheckCircle2 className="w-6 h-6 text-cyan-400 shrink-0 mt-1" />
                  <p className="text-gray-300 text-lg">{benefit}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="relative py-20 px-4 border-t border-pink-500/20">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl md:text-6xl font-bold mb-6">
              <span className="neon-cyan">READY TO</span>{" "}
              <span className="neon-pink">LEVEL UP?</span>
            </h2>
            <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
              Join thousands of professionals who have transformed their productivity with GYST.
              Start your journey today.
            </p>
            <Button
              asChild
              size="lg"
              className="bg-linear-to-r from-cyan-500 via-pink-500 to-cyan-500 text-black font-bold text-xl px-12 py-8 glow-cyan-pink hover:scale-105 transition-all duration-300 scan-line"
            >
              <Link href="/auth/sign-up" className="flex items-center gap-3">
                <Sparkles className="w-6 h-6" />
                Get Started Now
                <ArrowRight className="w-6 h-6" />
              </Link>
            </Button>
          </div>
        </section>

        {/* Footer */}
        <footer className="w-full flex flex-col items-center justify-center border-t border-cyan-500/20 mx-auto text-center text-xs gap-8 py-16 px-4 bg-black/50">
          <div className="flex flex-wrap justify-center gap-6 mb-4">
            <Link href="/" className="text-cyan-400 hover:text-cyan-300 transition-colors">Home</Link>
            <Link href="/home" className="text-cyan-400 hover:text-cyan-300 transition-colors">Dashboard</Link>
            <Link href="/auth/login" className="text-cyan-400 hover:text-cyan-300 transition-colors">Login</Link>
            <Link href="/auth/sign-up" className="text-pink-400 hover:text-pink-300 transition-colors">Sign Up</Link>
          </div>
          <ThemeSwitcher />
          <p className="text-gray-500 mt-4">
            © <Suspense fallback={<span>2026</span>}> <CopyrightYear /></Suspense> GYST. Built for the future of productivity.
          </p>
        </footer>
      </main>
    </div>
  );
}
