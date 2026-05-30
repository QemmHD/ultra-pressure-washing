import { Outlet } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import StickyMobileBar from "./StickyMobileBar";

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow">
        <Outlet />
      </main>
      <Footer />
      {/* Spacer so the fixed mobile bar never covers footer content */}
      <div className="h-16 md:hidden" aria-hidden="true" />
      <StickyMobileBar />
    </div>
  );
}
