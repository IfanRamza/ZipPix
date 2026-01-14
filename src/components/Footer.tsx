import { Link } from "react-router-dom";
import Github from "../assets/github.svg";

export function Footer() {
  return (
    <footer className="border-t border-border/50 bg-background/50 backdrop-blur-xl mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between text-sm text-muted-foreground gap-4">
          <p>© 2025 ZipPix. Privacy-first image compression.</p>

          <div className="flex items-center gap-6">
            <Link
              to="/privacy"
              className="hover:text-cyan-400 transition-colors"
            >
              Privacy Policy
            </Link>
            <Link to="/terms" className="hover:text-cyan-400 transition-colors">
              Terms of Service
            </Link>
            <a
              href="https://github.com/IfanRamza/ZipPix"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-cyan-400 transition-colors flex items-center gap-1"
            >
              <img src={Github} alt="GitHub" className="w-4 h-4" />
              GitHub
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
