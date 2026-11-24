'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Mail, Sprout } from 'lucide-react';

interface SiteFooterProps {
  authenticated: boolean;
  onStart: () => void;
}

const FOOTER_COLUMNS = [
  {
    title: 'Produk',
    links: [
      { label: '13 fitur CermatTani', href: '#fitur-lengkap' },
      { label: 'Cek hama & penyakit', href: '/scan' },
      { label: 'Tanaman kebun', href: '/tanaman' },
      { label: 'Kalender panen', href: '/kalender' },
      { label: 'Pengingat Telegram', href: '/pengaturan' },
    ],
  },
  {
    title: 'Sumber daya',
    links: [
      { label: 'Cara kerja', href: '#cara-kerja' },
      { label: 'Bukti data', href: '#bukti-angka' },
      { label: 'Lahan & sensor', href: '/lahan' },
      { label: 'Pusat bantuan', href: 'mailto:bantuan@cermattani.id?subject=Pusat%20Bantuan' },
    ],
  },
  {
    title: 'Perusahaan',
    links: [
      { label: 'Tentang kami', href: '#jalan-kami' },
      { label: 'Nilai kami', href: '#nilai-kami' },
      { label: 'Masuk petani', href: '/login' },
      { label: 'Hubungi kami', href: 'mailto:bantuan@cermattani.id' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Kebijakan Privasi', href: 'mailto:bantuan@cermattani.id?subject=Kebijakan%20Privasi' },
      { label: 'Syarat & Ketentuan', href: 'mailto:bantuan@cermattani.id?subject=Syarat%20dan%20Ketentuan' },
      { label: 'Keamanan Data', href: 'mailto:bantuan@cermattani.id?subject=Keamanan%20Data' },
    ],
  },
];

export const SiteFooter: React.FC<SiteFooterProps> = ({ authenticated, onStart }) => {
  const footerRef = useRef<HTMLElement | null>(null);
  const animationFrame = useRef<number | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [mascotPose, setMascotPose] = useState<'bibit' | 'jempol'>('bibit');

  useEffect(() => {
    const node = footerRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const updateParallax = () => {
      if (animationFrame.current !== null) return;
      animationFrame.current = window.requestAnimationFrame(() => {
        animationFrame.current = null;
        const node = footerRef.current;
        if (!node) return;
        const distance = window.innerHeight - node.getBoundingClientRect().top;
        const offset = Math.max(-80, Math.min(80, distance * 0.08));
        node.style.setProperty('--ct-parallax-back', `${offset * 0.12}px`);
        node.style.setProperty('--ct-parallax-front', `${offset * 0.3}px`);
      });
    };

    window.addEventListener('scroll', updateParallax, { passive: true });
    window.addEventListener('resize', updateParallax);
    updateParallax();
    return () => {
      window.removeEventListener('scroll', updateParallax);
      window.removeEventListener('resize', updateParallax);
      if (animationFrame.current !== null) {
        window.cancelAnimationFrame(animationFrame.current);
      }
    };
  }, []);

  return (
    <footer ref={footerRef} id="footer" className={`ct-footer ${isVisible ? 'is-visible' : ''}`}>
      <section className="ct-footer-scenery" aria-label="Mulai bertani bersama CermatTani">
        <div className="ct-footer-sun" aria-hidden="true" />
        <div className="ct-footer-cloud ct-footer-cloud--one" aria-hidden="true" />
        <div className="ct-footer-cloud ct-footer-cloud--two" aria-hidden="true" />
        <svg className="ct-footer-birds" viewBox="0 0 170 50" aria-hidden="true">
          <path d="M8 25q9-13 18 0 9-13 18 0M78 14q7-10 14 0 7-10 14 0M125 34q6-8 12 0 6-8 12 0" />
        </svg>

        <div className="ct-footer-scenery-copy">
          <span className="ct-footer-eyebrow"><Sprout size={15} /> TUMBUH BERSAMA PETANI</span>
          <h2>Bertani lebih cermat,<br />panen lebih berkah.</h2>
          <button
            type="button"
            className="ct-footer-cta"
            onClick={onStart}
            onPointerEnter={() => setMascotPose('jempol')}
            onPointerLeave={() => setMascotPose('bibit')}
            onFocus={() => setMascotPose('jempol')}
            onBlur={() => setMascotPose('bibit')}
          >
            {authenticated ? 'Buka dasbor kebun' : 'Mulai kelola kebun'}
            <ArrowUpRight size={15} />
          </button>
        </div>

        <svg className="ct-footer-back-hills" viewBox="0 0 1440 360" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
          <path className="ct-footer-mountain" d="m0 246 100-98 80 66 124-129 148 161 106-74 103 85 146-132 136 115 108-75 105 85 98-78 90 91v97H0Z" />
          <path className="ct-footer-hill ct-footer-hill--back" d="M0 209c184-76 339 46 508 24 171-22 254-116 422-61 151 49 316-13 510 22v166H0Z" />
          <path className="ct-footer-hill ct-footer-hill--middle" d="M0 258c180-62 352 39 523 29 185-11 300-88 458-41 148 44 304 2 459 17v97H0Z" />
          <path className="ct-footer-terrace" d="M62 275c137-41 249-26 362 5m-313 18c150-36 263-13 359 15m443-52c112-35 225-27 352-3m-329 29c118-29 232-20 354 2" />
          <path className="ct-footer-river" d="M1210 360c-22-56-103-72-75-123 22-41 109-47 117-104 4-28-14-55-39-85" />
          <path className="ct-footer-river-shine" d="M1210 360c-22-56-103-72-75-123 22-41 109-47 117-104 4-28-14-55-39-85" />
          <path className="ct-footer-hut" d="M305 268v-34l27-23 27 23v34h-54Zm-8-32 35-30 35 30" />
          <path className="ct-footer-pine" d="m130 262 18-34 18 34h-11v20h-14v-20h-11Zm1124-32 17-34 18 34h-11v19h-14v-19h-10Z" />
        </svg>

        <img
          key={mascotPose}
          className="ct-footer-mascot"
          src={mascotPose === 'jempol'
            ? '/mascot/pak-cermat/08_petani_pose_jempol.png'
            : '/mascot/pak-cermat/05_petani_memeriksa_bibit.png'}
          alt=""
          loading="lazy"
          decoding="async"
          aria-hidden="true"
        />
        <svg className="ct-footer-front-hill" viewBox="0 0 1440 180" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 77c142-48 257-41 407-5 138 33 279-28 415-21 164 8 278 55 430 25 72-15 131-16 188-5v109H0Z" />
          <path className="ct-footer-grass" d="m180 75-8-22m16 24 7-27m438 35-6-21m14 22 9-25m413 43-7-25m16 24 8-20" />
          <path className="ct-footer-leaf ct-footer-leaf--one" d="M245 28c10-15 25-11 27 1-10 12-21 13-27-1Zm955 20c11-15 25-11 27 1-10 12-21 13-27-1Z" />
        </svg>
      </section>

      <div className="ct-footer-main">
        <div className="ct-footer-content">
          <div className="ct-footer-grid">
            <section className="ct-footer-brand">
              <a href="#jalan-kami" className="ct-footer-logo">
                <Sprout size={22} />
                <span>CermatTani</span>
              </a>
              <p>Teman petani untuk bertani lebih cermat, hasil lebih berkah.</p>
              <a className="ct-footer-contact" href="mailto:bantuan@cermattani.id">
                <Mail size={15} />
                bantuan@cermattani.id
              </a>
            </section>

            {FOOTER_COLUMNS.map((column, columnIndex) => (
              <details
                key={column.title}
                className="ct-footer-column"
                open
                style={{ transitionDelay: `${columnIndex * 80}ms` }}
              >
                <summary>{column.title}</summary>
                <nav aria-label={`Footer ${column.title}`}>
                  <ul>
                    {column.links.map((link) => (
                      <li key={link.label}>
                        <a href={link.href}>{link.label}</a>
                      </li>
                    ))}
                  </ul>
                </nav>
              </details>
            ))}
          </div>

          <p className="ct-footer-note">
            Catatan: Hasil AI dan rekomendasi pupuk adalah alat bantu, bukan pengganti uji tanah atau arahan penyuluh.
            Data sensor virtual selalu diberi label Simulasi.
          </p>

          <div className="ct-footer-legal">
            <span>© 2026 Cermat Tani. Hak cipta dilindungi.</span>
            <nav aria-label="Tautan legal">
              <a href="mailto:bantuan@cermattani.id?subject=Kebijakan%20Privasi">Privasi</a>
              <span aria-hidden="true">·</span>
              <a href="mailto:bantuan@cermattani.id?subject=Syarat%20dan%20Ketentuan">Syarat</a>
              <span aria-hidden="true">·</span>
              <a href="#fitur-lengkap">Peta situs</a>
            </nav>
            <span className="ct-footer-made">Dibuat dengan <span aria-label="semangat">🌱</span> untuk petani Indonesia</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
