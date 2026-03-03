import Footer from "./components/footer"
import NavBar from "./components/nav-bar"

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="grid grid-rows-[auto_1fr_auto] min-h-dvh">
      <nav>
        <NavBar />
      </nav>
      {children}
      <footer>
        <Footer />          
      </footer>
    </div>
  );
}
