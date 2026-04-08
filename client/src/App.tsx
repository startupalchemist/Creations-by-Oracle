import { Switch, Route } from "wouter";
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
