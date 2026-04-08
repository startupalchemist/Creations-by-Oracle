import { Switch, Route, useSearch } from "wouter";
import { lazy, Suspense } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import Header from "@/components/header";
import Footer from "@/components/footer";
import Home from "@/pages/home";
import NotFound from "@/pages/not-found";
import { CheckCircle } from "lucide-react";

const About = lazy(() => import("@/pages/about"));
const Contact = lazy(() => import("@/pages/contact"));
const Admin = lazy(() => import("@/pages/admin"));
const Login = lazy(() => import("@/pages/login"));
const Blog = lazy(() => import("@/pages/blog"));
const BlogPost = lazy(() => import("@/pages/blog-post"));
const Rate = lazy(() => import("@/pages/rate"));
const Gallery = lazy(() => import("@/pages/gallery"));
const Shop = lazy(() => import("@/pages/shop"));
const Artwork = lazy(() => import("@/pages/artwork"));
const Commission = lazy(() => import("@/pages/commission"));

function PageLoader() {
  return (
    <div className="bg-[#08060e] min-h-screen flex items-center justify-center">
      <div className="w-5 h-5 border-2 border-[#C084FC] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function CommissionThankYou() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const commissionId = params.get("commission");
  return (
    <div className="bg-[#08060e] min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <CheckCircle className="w-16 h-16 text-[#C084FC] mx-auto mb-6" />
        <h1 className="font-serif text-3xl text-white mb-4">Payment Received</h1>
        <p className="text-[#B3B3B8] text-base leading-relaxed mb-2">
          Thank you — your final payment has been confirmed and your commission is now complete.
        </p>
        {commissionId && (
          <p className="text-[#B3B3B8] text-sm mb-6">Commission #{commissionId}</p>
        )}
        <p className="text-[#B3B3B8] text-sm mb-8">
          You'll receive a confirmation email shortly with delivery details.
        </p>
        <a
          href="/"
          className="inline-block bg-[#C084FC] text-[#08060e] font-semibold text-sm px-8 py-3 rounded-sm tracking-wide hover:bg-[#a855f7] transition-colors"
          data-testid="link-home"
        >
          Return Home
        </a>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/gallery" component={Gallery} />
        <Route path="/shop" component={Shop} />
        <Route path="/shop/:slug" component={Artwork} />
        <Route path="/about" component={About} />
        <Route path="/contact" component={Contact} />
        <Route path="/admin" component={Admin} />
        <Route path="/login" component={Login} />
        <Route path="/blog" component={Blog} />
        <Route path="/blog/:slug" component={BlogPost} />
        <Route path="/rate/:token" component={Rate} />
        <Route path="/commission" component={Commission} />
        <Route path="/commissions/thank-you" component={CommissionThankYou} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <div className="grain-overlay" />
          <Header />
          <main>
            <Router />
          </main>
          <Footer />
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
