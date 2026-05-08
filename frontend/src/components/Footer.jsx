import React from 'react';
import { Link } from 'react-router-dom';
import { Github, Heart } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="relative mt-auto border-t border-white/5 bg-[#0b1120]">
      {/* Subtle gradient line at top */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Logo + tagline */}
          <div className="text-center md:text-left">
            <Link to="/" className="inline-block">
              <span className="text-xl font-extrabold tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                <span className="text-emerald-400">Eat</span>
                <span className="text-amber-400">iT</span>
              </span>
            </Link>
            <p className="text-slate-500 text-xs mt-1">AI-powered nutrition assistant</p>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6">
            <a href="https://github.com/Prsahant123kumar/EatiT" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-emerald-400 transition-colors">
              <Github className="w-4 h-4" />
            </a>
            <span className="text-slate-600 text-xs">
              Built with <Heart className="w-3 h-3 inline text-red-400 mx-0.5" /> at Hack36
            </span>
          </div>

          {/* Copyright */}
          <p className="text-slate-600 text-xs">
            © {new Date().getFullYear()} EatiT
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
