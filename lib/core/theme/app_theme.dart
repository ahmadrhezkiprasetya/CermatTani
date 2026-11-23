import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Token warna CermatTani persis DESIGN (3).md §3 & §13
abstract final class AppColors {
  // Inti Light
  static const leaf600 = Color(0xFF17803F);
  static const leaf500 = Color(0xFF1F9D55);
  static const leaf700 = Color(0xFF0F5E2D);
  static const lime300 = Color(0xFFD8F36A);
  static const forest900 = Color(0xFF0E4F43);
  static const tomato500 = Color(0xFFF2562B);
  static const tomatoBtn = Color(0xFFD63D12);
  static const tomatoBtnDark = Color(0xFFA62D0B);
  static const sun400 = Color(0xFFFFB63D);

  // Inti Dark
  static const leaf600Dark = Color(0xFF3DBE74);
  static const leaf700Dark = Color(0xFF2FA862);
  static const lime300Dark = Color(0xFFC9E85A);
  static const forest900Dark = Color(0xFF0A3A32);
  static const tomato500Dark = Color(0xFFFF6B42);
  static const sun400Dark = Color(0xFFFFC45E);

  // Netral Light
  static const bgLight = Color(0xFFEEF7F1);
  static const surfaceLight = Color(0xFFFFFFFF);
  static const surface2Light = Color(0xFFF5FAF6);
  static const inkLight = Color(0xFF14302A);
  static const inkSoftLight = Color(0xFF5B746B);
  static const lineLight = Color(0xFFDCEBE1);

  // Netral Dark
  static const bgDark = Color(0xFF0C1713);
  static const surfaceDark = Color(0xFF14231D);
  static const surface2Dark = Color(0xFF1A2D25);
  static const inkDark = Color(0xFFEAF5EE);
  static const inkSoftDark = Color(0xFF9DB8AD);
  static const lineDark = Color(0xFF25402F);

  // Semantik
  static const ok = Color(0xFF1F9D55);
  static const warn = Color(0xFFFFB63D);
  static const warnInk = Color(0xFF8A5600);
  static const bad = Color(0xFFE5484D);
  static const water = Color(0xFF2B8FD9);
  static const sim = Color(0xFF7A6CF0);

  // Kematangan tomat (konsisten di kotak deteksi, chip, kalender)
  static const mentah = Color(0xFF5DBB63);
  static const setengahMatang = Color(0xFFFFB63D);
  static const matang = Color(0xFFF2562B);
  static const peachBar = Color(0xFFFFD8C2);
}

class CermatPalette {
  const CermatPalette({
    required this.isDark,
    required this.bg,
    required this.surface,
    required this.surface2,
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

  static const light = CermatPalette(
    isDark: false,
    bg: AppColors.bgLight,
    surface: AppColors.surfaceLight,
    surface2: AppColors.surface2Light,
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
    ink: AppColors.inkDark,
    inkSoft: AppColors.inkSoftDark,
    line: AppColors.lineDark,
    leaf600: AppColors.leaf600Dark,
    leaf700: AppColors.leaf700Dark,
    onLeaf: Color(0xFF0B2619),
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
        onSecondary: AppColors.inkLight,
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
        displaySmall: GoogleFonts.fredoka(fontSize: 32, fontWeight: FontWeight.w600, height: 1.08, color: p.ink),
        headlineMedium: GoogleFonts.fredoka(fontSize: 26, fontWeight: FontWeight.w600, height: 1.15, color: p.ink),
        headlineSmall: GoogleFonts.fredoka(fontSize: 22, fontWeight: FontWeight.w600, height: 1.2, color: p.ink),
        titleLarge: GoogleFonts.fredoka(fontSize: 18, fontWeight: FontWeight.w600, height: 1.3, color: p.ink),
        bodyLarge: GoogleFonts.plusJakartaSans(fontSize: 16, height: 1.55, color: p.ink),
        bodyMedium: GoogleFonts.plusJakartaSans(fontSize: 15, height: 1.5, color: p.ink),
        bodySmall: GoogleFonts.plusJakartaSans(fontSize: 13, height: 1.45, color: p.inkSoft),
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: p.bg,
        foregroundColor: p.ink,
        elevation: 0,
        scrolledUnderElevation: 0,
      ),
    );
  }
}
