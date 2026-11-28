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
      { label: 'Fitur unggulan', href: '#fitur-unggulan' },
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

/* Rumpun tomat di dua baris bedengan bukit depan: [x, y, buah merah?] */
const FOOTER_CROPS: Array<[number, number, boolean]> = [];
for (let x = 52; x < 1420; x += 74) FOOTER_CROPS.push([x, 110 + Math.sin(x / 140) * 6, x % 148 < 74]);
for (let x = 88; x < 1420; x += 74) FOOTER_CROPS.push([x, 146 + Math.sin(x / 160) * 5, x % 222 < 111]);

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
          <defs>
            <linearGradient id="ctfMtnFar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8fbea9" />
              <stop offset="100%" stopColor="#cfe5d9" />
            </linearGradient>
            <linearGradient id="ctfMtnNear" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4f8f70" />
              <stop offset="100%" stopColor="#86b89c" />
            </linearGradient>
            <linearGradient id="ctfHillBack" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2a8a4f" />
              <stop offset="100%" stopColor="#11602f" />
            </linearGradient>
            <linearGradient id="ctfHillMid" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#36ad62" />
              <stop offset="100%" stopColor="#1b8442" />
            </linearGradient>
          </defs>
          {/* Gunung jauh & dekat */}
          <path className="ct-footer-mountain" fill="url(#ctfMtnFar)" d="M0 232 L118 150 L206 196 L330 108 L468 204 L588 150 L702 200 L842 98 L982 190 L1102 140 L1222 200 L1332 128 L1440 188 V360 H0Z" />
          <path className="ct-footer-mountain ct-footer-mountain--near" fill="url(#ctfMtnNear)" d="M0 264 L148 192 L262 236 L402 172 L540 250 L662 206 L782 256 L930 182 L1062 246 L1182 202 L1302 252 L1440 216 V360 H0Z" />
          {/* Bukit belakang + terasering */}
          <path className="ct-footer-hill" fill="url(#ctfHillBack)" d="M0 214c184-70 339 44 508 22 171-22 254-110 422-57 151 47 316-11 510 22v159H0Z" />
          <path className="ct-footer-terrace" d="M62 278c137-41 249-26 362 5m-313 18c150-36 263-13 359 15m443-52c112-35 225-27 352-3m-329 29c118-29 232-20 354 2" />
          {/* Pohon rimbun di punggung bukit */}
          <g className="ct-footer-trees">
            {[
              [96, 226, 1.5],
              [140, 232, 1.15],
              [452, 226, 1.3],
              [1236, 212, 1.5],
              [1282, 222, 1.1],
              [1376, 220, 1.3],
            ].map(([x, y, k]) => (
              <g key={`${x}-${y}`} transform={`translate(${x} ${y}) scale(${k})`}>
                <rect className="ct-footer-tree-trunk" x="-3" y="-4" width="6" height="18" rx="2" />
                <circle className="ct-footer-tree-crown" cx="0" cy="-16" r="16" />
                <circle className="ct-footer-tree-crown ct-footer-tree-crown--light" cx="-7" cy="-21" r="9" />
              </g>
            ))}
          </g>
          {/* Bukit tengah */}
          <path className="ct-footer-hill" fill="url(#ctfHillMid)" d="M0 262c180-58 352 37 523 27 185-11 300-84 458-39 148 42 304 2 459 17v93H0Z" />
          {/* Pondok sawah */}
          <path className="ct-footer-hut" d="M305 272v-30l27-21 27 21v30h-54Zm-8-28 35-28 35 28" />
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
          {/* Alur bedengan */}
          <path className="ct-footer-rows" d="M0 118c240-22 480-6 720-14s480-24 720-6M0 154c240-18 480-4 720-10s480-20 720-4" />
          {/* Rumpun tomat berbuah */}
          {FOOTER_CROPS.map(([x, y, ripe]) => (
            <g key={`${x}-${y}`} className="ct-footer-crop" transform={`translate(${x} ${y.toFixed(1)})`}>
              <ellipse className="ct-footer-crop-leaf" cx="0" cy="0" rx="17" ry="9" />
              <ellipse className="ct-footer-crop-leaf ct-footer-crop-leaf--light" cx="-5" cy="-3" rx="9" ry="5" />
              <circle className={ripe ? 'ct-footer-fruit' : 'ct-footer-fruit ct-footer-fruit--half'} cx="-6" cy="2" r="3.6" />
              <circle className="ct-footer-fruit" cx="6" cy="3" r="3.2" />
            </g>
          ))}
          {/* Rumpun daun (pengganti garis rumput) */}
          <path className="ct-footer-grass" d="M176 70c-2-10-8-16-14-19 8 1 13 6 15 12 1-9 6-15 12-18-4 6-6 13-5 22M640 80c-2-10-8-16-14-19 8 1 13 6 15 12 1-9 6-15 12-18-4 6-6 13-5 22M1056 98c-2-10-8-16-14-19 8 1 13 6 15 12 1-9 6-15 12-18-4 6-6 13-5 22" />
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
            </nav>
            <span className="ct-footer-made">Dibuat dengan <span aria-label="semangat">🌱</span> untuk petani Indonesia</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
