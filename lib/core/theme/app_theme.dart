import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Palet Terpadu CermatTani — Hijau Susu Matcha × Krim Susu Hangat × Koral Lembut
/// 100% sinkron dengan website/src/styles/tokens.css (WCAG 2.2 AA)
abstract final class AppColors {
  // Hijau Susu Matcha (teduh, segar, tidak gelap)
  static const leaf700 = Color(0xFF286C46);
  static const leaf600 = Color(0xFF358458);
  static const leaf500 = Color(0xFF4A9E6E);
  static const lime300 = Color(0xFFC3E5C8);
  static const limeSoft = Color(0xFFDDF0E0);
  static const forest900 = Color(0xFF358458);

  // Krim Susu Hangat (warna pendamping utama)
  static const creamWarm = Color(0xFFF9F3E4);
  static const creamSoft = Color(0xFFF2ECDC);
  static const creamBorder = Color(0xFFE5D8BE);

  // Koral Tomat Lembut
  static const tomato500 = Color(0xFFE87C5E);
  static const tomatoBtn = Color(0xFFD86749);
  static const tomatoBtnDark = Color(0xFFB85135);
  static const sun400 = Color(0xFFE8AC44);

  // Inti Mode Gelap Lembut
  static const leaf600Dark = Color(0xFF64BB8B);
  static const leaf700Dark = Color(0xFF4CA374);
  static const lime300Dark = Color(0xFF2B4C3A);
  static const forest900Dark = Color(0xFF397858);
  static const tomato500Dark = Color(0xFFF29074);
  static const sun400Dark = Color(0xFFF5C66F);

  // Netral Light (Hijau Susu × Putih Bersih)
  static const bgLight = Color(0xFFEEF6EF);
  static const surfaceLight = Color(0xFFFFFFFF);
  static const surface2Light = Color(0xFFE2EFE4);
  static const surfaceMilkLight = Color(0xFFD6EAD9);
  static const inkLight = Color(0xFF1F392D);
  static const inkSoftLight = Color(0xFF536E61);
  static const lineLight = Color(0xFFC5DEC9);

  // Netral Dark Lembut
  static const bgDark = Color(0xFF16241E);
  static const surfaceDark = Color(0xFF1E3028);
  static const surface2Dark = Color(0xFF253B31);
  static const surfaceMilkDark = Color(0xFF22382E);
  static const inkDark = Color(0xFFECF6EE);
  static const inkSoftDark = Color(0xFFAEC7B9);
  static const lineDark = Color(0xFF314D40);

  // Semantik Pastel Lembut
  static const okBg = Color(0xFFD5ECD9);
  static const okFg = Color(0xFF215F3D);
  static const warnBg = Color(0xFFFCEFD4);
  static const warnInk = Color(0xFF825510);
  static const badBg = Color(0xFFFCE6E4);
  static const badFg = Color(0xFFA13731);
  static const waterBg = Color(0xFFE0EFF9);
  static const waterFg = Color(0xFF2E79AD);
  static const simBg = Color(0xFFECEAFE);
  static const simFg = Color(0xFF6054C2);

  static const ok = Color(0xFF419A68);
  static const warn = Color(0xFFE8AC44);
  static const bad = Color(0xFFD95F58);
  static const water = Color(0xFF4494CA);
  static const sim = Color(0xFF7D72DF);

  // Kematangan tomat (harmonis dengan palet hijau susu)
  static const mentah = Color(0xFF48A370);
  static const setengahMatang = Color(0xFFECB04C);
  static const matang = Color(0xFFE37153);
  static const peachBar = Color(0xFFF6DAD0);
}

class CermatPalette {
  const CermatPalette({
    required this.isDark,
    required this.bg,
    required this.surface,
    required this.surface2,
    required this.surfaceMilk,
    required this.creamWarm,
    required this.creamBorder,
    required this.ink,
    required this.inkSoft,
    required this.line,
    required this.leaf600,
    required this.leaf700,
    required this.onLeaf,
    required this.lime300,
    required this.forest900,
    required this.tomato500,
    required this.sun400,
  });

  final bool isDark;
  final Color bg;
  final Color surface;
  final Color surface2;
  final Color surfaceMilk;
  final Color creamWarm;
  final Color creamBorder;
  final Color ink;
  final Color inkSoft;
  final Color line;
  final Color leaf600;
  final Color leaf700;
  final Color onLeaf;
  final Color lime300;
  final Color forest900;
  final Color tomato500;
  final Color sun400;

  LinearGradient get accentGradient => isDark
      ? const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF21372D), Color(0xFF273D33), Color(0xFF2C352A)],
        )
      : const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFFD8ECD9), Color(0xFFEAF4EB), Color(0xFFF8F2E2)],
        );

  static const light = CermatPalette(
    isDark: false,
    bg: AppColors.bgLight,
    surface: AppColors.surfaceLight,
    surface2: AppColors.surface2Light,
    surfaceMilk: AppColors.surfaceMilkLight,
    creamWarm: AppColors.creamWarm,
    creamBorder: AppColors.creamBorder,
    ink: AppColors.inkLight,
    inkSoft: AppColors.inkSoftLight,
    line: AppColors.lineLight,
    leaf600: AppColors.leaf600,
    leaf700: AppColors.leaf700,
    onLeaf: Colors.white,
    lime300: AppColors.lime300,
    forest900: AppColors.forest900,
    tomato500: AppColors.tomato500,
    sun400: AppColors.sun400,
  );

  static const dark = CermatPalette(
    isDark: true,
    bg: AppColors.bgDark,
    surface: AppColors.surfaceDark,
    surface2: AppColors.surface2Dark,
    surfaceMilk: AppColors.surfaceMilkDark,
    creamWarm: Color(0xFF2A2C24),
    creamBorder: Color(0xFF3A3F34),
    ink: AppColors.inkDark,
    inkSoft: AppColors.inkSoftDark,
    line: AppColors.lineDark,
    leaf600: AppColors.leaf600Dark,
    leaf700: AppColors.leaf700Dark,
    onLeaf: Color(0xFF0F291C),
    lime300: AppColors.lime300Dark,
    forest900: AppColors.forest900Dark,
    tomato500: AppColors.tomato500Dark,
    sun400: AppColors.sun400Dark,
  );
}

extension CermatThemeContext on BuildContext {
  CermatPalette get ct =>
      Theme.of(this).brightness == Brightness.dark ? CermatPalette.dark : CermatPalette.light;

  TextStyle displayStyle({double size = 24, Color? color}) => GoogleFonts.fredoka(
        fontSize: size,
        fontWeight: FontWeight.w600,
        height: 1.15,
        color: color ?? ct.ink,
      );

  TextStyle cardTitleStyle({double size = 17.5, Color? color}) => GoogleFonts.plusJakartaSans(
        fontSize: size,
        fontWeight: FontWeight.w700,
        height: 1.3,
        letterSpacing: -0.2,
        color: color ?? ct.ink,
      );
}

abstract final class AppTheme {
  static ThemeData get light => _build(Brightness.light, CermatPalette.light);
  static ThemeData get dark => _build(Brightness.dark, CermatPalette.dark);

  static ThemeData _build(Brightness brightness, CermatPalette p) {
    final base = ThemeData(
      useMaterial3: true,
      brightness: brightness,
      scaffoldBackgroundColor: p.bg,
      colorScheme: ColorScheme(
        brightness: brightness,
        primary: p.leaf600,
        onPrimary: p.onLeaf,
        secondary: p.lime300,
        onSecondary: p.ink,
        error: AppColors.bad,
        onError: Colors.white,
        surface: p.surface,
        onSurface: p.ink,
      ),
      dividerColor: p.line,
    );

    final bodyTheme = GoogleFonts.plusJakartaSansTextTheme(base.textTheme).apply(
      bodyColor: p.ink,
      displayColor: p.ink,
    );

    return base.copyWith(
      textTheme: bodyTheme.copyWith(
        displaySmall: GoogleFonts.fredoka(fontSize: 30, fontWeight: FontWeight.w600, height: 1.08, color: p.ink),
        headlineMedium: GoogleFonts.fredoka(fontSize: 24, fontWeight: FontWeight.w600, height: 1.15, color: p.ink),
        headlineSmall: GoogleFonts.fredoka(fontSize: 20, fontWeight: FontWeight.w600, height: 1.2, color: p.ink),
        titleLarge: GoogleFonts.plusJakartaSans(fontSize: 17.5, fontWeight: FontWeight.w700, height: 1.3, color: p.ink),
        bodyLarge: GoogleFonts.plusJakartaSans(fontSize: 15.5, height: 1.55, color: p.ink),
        bodyMedium: GoogleFonts.plusJakartaSans(fontSize: 14.5, height: 1.5, color: p.ink),
        bodySmall: GoogleFonts.plusJakartaSans(fontSize: 12.5, height: 1.45, color: p.inkSoft),
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: p.bg,
        foregroundColor: p.ink,
        elevation: 0,
        scrolledUnderElevation: 0,
      ),
      sliderTheme: SliderThemeData(
        activeTrackColor: p.leaf600,
        inactiveTrackColor: p.line,
        thumbColor: p.leaf600,
        overlayColor: p.leaf600.withAlpha(32),
      ),
    );
  }
}
