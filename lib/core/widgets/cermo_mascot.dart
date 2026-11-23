import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

/// 7 pose resmi Maskot Cermo si Tomat (DESIGN.md §8)
enum CermoPose { wave, scan, happy, worried, water, thinking, sleep }

const _cermoTips = [
  'Halo! Foto tomat di tempat terang biar Cermo makin cermat.',
  'Cek bagian bawah daun juga ya, bercak sering mulai dari sana.',
  'Siram pagi atau sore supaya air tidak cepat menguap.',
  'Tomat setengah matang biasanya siap panen 2 sampai 4 hari lagi.',
  'Kalau hasil scan kurang yakin, jangan ragu tanya penyuluh ya!',
];

class CermoMascot extends StatefulWidget {
  const CermoMascot({
    super.key,
    this.pose = CermoPose.wave,
    this.size = 88,
    this.interactive = true,
    this.tipOverride,
  });

  final CermoPose pose;
  final double size;
  final bool interactive;
  final String? tipOverride;

  @override
  State<CermoMascot> createState() => _CermoMascotState();
}

class _CermoMascotState extends State<CermoMascot> with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;
  int _tipIdx = 0;
  bool _jumping = false;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 3000))..repeat();
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  void _onTap() {
    if (!widget.interactive) return;
    setState(() {
      _jumping = true;
      _tipIdx = (_tipIdx + 1) % _cermoTips.length;
    });
    final tip = widget.tipOverride ?? _cermoTips[_tipIdx];
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text('Cermo: $tip'),
          behavior: SnackBarBehavior.floating,
          duration: const Duration(seconds: 3),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        ),
      );
    Future<void>.delayed(const Duration(milliseconds: 450), () {
      if (mounted) setState(() => _jumping = false);
    });
  }

  @override
  Widget build(BuildContext context) {
    final safeSize = math.max(40.0, widget.size);
    final reducedMotion = MediaQuery.maybeOf(context)?.disableAnimations ?? false;

    return GestureDetector(
      onTap: _onTap,
      child: AnimatedBuilder(
        animation: _ctrl,
        builder: (_, __) {
          final t = reducedMotion ? 0.0 : _ctrl.value * 2 * math.pi;
          final breathe = 1.0 + math.sin(t) * 0.03;
          final jumpOffset = _jumping ? -10.0 : 0.0;
          return AnimatedContainer(
            duration: const Duration(milliseconds: 220),
            transform: Matrix4.identity()
              ..translate(0.0, jumpOffset)
              ..scale(_jumping ? 1.06 : breathe, _jumping ? 0.95 : breathe),
            transformAlignment: Alignment.bottomCenter,
            width: safeSize,
            height: safeSize,
            child: CustomPaint(
              painter: _CermoPainter(pose: widget.pose, phase: t),
            ),
          );
        },
      ),
    );
  }
}

class _CermoPainter extends CustomPainter {
  const _CermoPainter({required this.pose, required this.phase});
  final CermoPose pose;
  final double phase;

  @override
  void paint(Canvas canvas, Size size) {
    final s = size.width / 140.0;
    canvas.save();
    canvas.scale(s, s);

    // Bayangan tanah
    canvas.drawOval(
      const Rect.fromLTWH(36, 119, 68, 14),
      Paint()..color = const Color(0xFF14302A).withAlpha(36),
    );

    // Sepatu bot krem
    final bootFill = Paint()..color = const Color(0xFFF8F1E1);
    final bootStroke = Paint()
      ..color = const Color(0xFF14302A)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.4;
    for (final cx in [54.0, 86.0]) {
      final rect = Rect.fromCenter(center: Offset(cx, 116), width: 22, height: 15);
      canvas.drawOval(rect, bootFill);
      canvas.drawOval(rect, bootStroke);
    }

    // Tangan kiri
    final waveY = pose == CermoPose.wave ? 62.0 + math.sin(phase * 2) * 5 : 82.0;
    final leftHandX = pose == CermoPose.wave ? 22.0 : 26.0;
    canvas.drawCircle(Offset(leftHandX, waveY), 9.5, Paint()..color = AppColors.tomato500);

    // Tetes air untuk pose water
    if (pose == CermoPose.water) {
      final dropPath = Path()
        ..moveTo(16, 50)
        ..quadraticBezierTo(9, 60, 16, 72)
        ..quadraticBezierTo(23, 60, 16, 50)
        ..close();
      canvas.drawPath(dropPath, Paint()..color = AppColors.water);
    }

    // Badan tomat bulat (#F2562B + bayangan #D8431C)
    canvas.drawCircle(const Offset(70, 76), 42, Paint()..color = AppColors.tomato500);
    canvas.save();
    canvas.clipPath(Path()..addOval(Rect.fromCircle(center: const Offset(70, 76), radius: 42)));
    canvas.drawCircle(
      const Offset(84, 88),
      40,
      Paint()..color = const Color(0xFFD8431C).withAlpha(110),
    );
    canvas.restore();

    // Sorot putih kiri atas
    canvas.save();
    canvas.translate(50, 56);
    canvas.rotate(-0.45);
    canvas.drawOval(
      Rect.fromCenter(center: Offset.zero, width: 22, height: 12),
      Paint()..color = Colors.white.withAlpha(115),
    );
    canvas.restore();

    // Tunas: 3 daun hijau bergoyang ±4°
    canvas.save();
    canvas.translate(70, 36);
    canvas.rotate(math.sin(phase) * 0.07);
    canvas.drawPath(
      Path()
        ..moveTo(0, 0)
        ..quadraticBezierTo(2, -14, 12, -20),
      Paint()
        ..color = AppColors.leaf500
        ..style = PaintingStyle.stroke
        ..strokeWidth = 5
        ..strokeCap = StrokeCap.round,
    );
    canvas.drawOval(const Rect.fromLTWH(-32, -8, 32, 12), Paint()..color = AppColors.leaf500);
    canvas.drawOval(const Rect.fromLTWH(0, -8, 32, 12), Paint()..color = const Color(0xFF3DBE74));
    canvas.drawOval(const Rect.fromLTWH(-6, -18, 16, 18), Paint()..color = AppColors.leaf600);
    canvas.restore();

    // Pipi merah muda
    final blush = Paint()..color = const Color(0xFFFF98A3).withAlpha(180);
    canvas.drawOval(Rect.fromCenter(center: const Offset(46, 83), width: 13, height: 7.5), blush);
    canvas.drawOval(Rect.fromCenter(center: const Offset(94, 83), width: 13, height: 7.5), blush);

    // Mata & Ekspresi
    final darkInk = Paint()
      ..color = const Color(0xFF14302A)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3.2
      ..strokeCap = StrokeCap.round;
    final eyeFill = Paint()..color = const Color(0xFF14302A);

    if (pose == CermoPose.sleep) {
      canvas.drawArc(const Rect.fromLTWH(51, 69, 12, 8), 0, math.pi, false, darkInk);
      canvas.drawArc(const Rect.fromLTWH(77, 69, 12, 8), 0, math.pi, false, darkInk);
      canvas.drawCircle(const Offset(70, 87), 3.4, eyeFill);
      final tp = TextPainter(
        text: const TextSpan(
          text: 'zZz',
          style: TextStyle(color: AppColors.sim, fontSize: 15, fontWeight: FontWeight.w700),
        ),
        textDirection: TextDirection.ltr,
      )..layout();
      tp.paint(canvas, Offset(102, 18 + math.sin(phase) * 3));
    } else {
      canvas.drawCircle(const Offset(57, 72), 5.3, eyeFill);
      canvas.drawCircle(const Offset(83, 72), 5.3, eyeFill);
      canvas.drawCircle(const Offset(58.6, 70), 2, Paint()..color = Colors.white);
      canvas.drawCircle(const Offset(84.6, 70), 2, Paint()..color = Colors.white);

      if (pose == CermoPose.worried) {
        canvas.drawLine(const Offset(49, 62), const Offset(63, 65), darkInk);
        canvas.drawLine(const Offset(91, 62), const Offset(77, 65), darkInk);
        canvas.drawArc(const Rect.fromLTWH(58, 84, 24, 12), math.pi, math.pi, false, darkInk);
        canvas.drawCircle(const Offset(103, 64), 4.5, Paint()..color = const Color(0xFF78C6F7));
      } else if (pose == CermoPose.thinking) {
        canvas.drawLine(const Offset(62, 87), const Offset(78, 87), darkInk);
        canvas.drawCircle(const Offset(106, 30), 3, Paint()..color = AppColors.leaf500);
        canvas.drawCircle(const Offset(115, 24), 4, Paint()..color = AppColors.leaf600);
        canvas.drawCircle(const Offset(125, 19), 4.5, Paint()..color = AppColors.forest900);
      } else {
        canvas.drawArc(const Rect.fromLTWH(58, 78, 24, 14), 0.15, math.pi - 0.3, false, darkInk);
      }
    }

    // Tangan kanan + kaca pembesar hijau
    final glassDx = pose == CermoPose.scan ? math.sin(phase * 2) * 7 : 0.0;
    final glassDy = pose == CermoPose.scan ? math.cos(phase * 2) * 5 : 0.0;
    canvas.save();
    canvas.translate(glassDx, glassDy);
    canvas.drawCircle(const Offset(112, 82), 9.5, Paint()..color = AppColors.tomato500);
    canvas.drawLine(
      const Offset(114, 80),
      const Offset(122, 68),
      Paint()
        ..color = AppColors.leaf600
        ..strokeWidth = 5
        ..strokeCap = StrokeCap.round,
    );
    canvas.drawCircle(const Offset(126, 59), 11, Paint()..color = AppColors.lime300.withAlpha(115));
    canvas.drawCircle(
      const Offset(126, 59),
      11,
      Paint()
        ..color = AppColors.leaf500
        ..style = PaintingStyle.stroke
        ..strokeWidth = 3.5,
    );
    canvas.restore();

    canvas.restore();
  }

  @override
  bool shouldRepaint(covariant _CermoPainter old) => old.pose != pose || old.phase != phase;
}

/// Ilustrasi kebun datar bergradasi lembut tanpa teks (DESIGN.md §9)
class GardenLandscapeBanner extends StatelessWidget {
  const GardenLandscapeBanner({super.key, this.height = 148});
  final double height;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(20),
      child: SizedBox(
        width: double.infinity,
        height: height,
        child: CustomPaint(painter: _GardenPainter()),
      ),
    );
  }
}

class _GardenPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;

    // Langit biru muda
    canvas.drawRect(
      Offset.zero & size,
      Paint()
        ..shader = const LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xFFCBEBFB), Color(0xFFEBF8F0)],
        ).createShader(Offset.zero & size),
    );

    // Matahari
    canvas.drawCircle(Offset(w * 0.82, h * 0.24), 18, Paint()..color = AppColors.sun400);
    canvas.drawCircle(Offset(w * 0.82, h * 0.24), 28, Paint()..color = AppColors.sun400.withAlpha(55));

    // Bukit belakang
    final backHill = Path()
      ..moveTo(0, h * 0.62)
      ..quadraticBezierTo(w * 0.28, h * 0.36, w * 0.56, h * 0.58)
      ..quadraticBezierTo(w * 0.80, h * 0.42, w, h * 0.54)
      ..lineTo(w, h)
      ..lineTo(0, h)
      ..close();
    canvas.drawPath(backHill, Paint()..color = const Color(0xFF56BA76));

    // Bukit tengah
    final midHill = Path()
      ..moveTo(0, h * 0.72)
      ..quadraticBezierTo(w * 0.34, h * 0.54, w * 0.68, h * 0.70)
      ..quadraticBezierTo(w * 0.88, h * 0.62, w, h * 0.66)
      ..lineTo(w, h)
      ..lineTo(0, h)
      ..close();
    canvas.drawPath(midHill, Paint()..color = AppColors.leaf600);

    // Pohon cemara kiri
    for (final x in [w * 0.14, w * 0.22]) {
      final tree = Path()
        ..moveTo(x, h * 0.46)
        ..lineTo(x - 10, h * 0.66)
        ..lineTo(x + 10, h * 0.66)
        ..close();
      canvas.drawPath(tree, Paint()..color = AppColors.forest900);
    }

    // Kincir angin kecil kanan
    final wx = w * 0.70;
    final wy = h * 0.38;
    canvas.drawPath(
      Path()
        ..moveTo(wx, wy)
        ..lineTo(wx - 5, wy + 26)
        ..lineTo(wx + 5, wy + 26)
        ..close(),
      Paint()..color = Colors.white,
    );
    final bladePaint = Paint()
      ..color = AppColors.tomato500
      ..strokeWidth = 2.6
      ..strokeCap = StrokeCap.round;
    canvas.drawLine(Offset(wx, wy), Offset(wx, wy - 14), bladePaint);
    canvas.drawLine(Offset(wx, wy), Offset(wx + 12, wy + 7), bladePaint);
    canvas.drawLine(Offset(wx, wy), Offset(wx - 12, wy + 7), bladePaint);

    // Bukit depan + buah tomat kecil
    final frontHill = Path()
      ..moveTo(0, h * 0.86)
      ..quadraticBezierTo(w * 0.50, h * 0.72, w, h * 0.86)
      ..lineTo(w, h)
      ..lineTo(0, h)
      ..close();
    canvas.drawPath(frontHill, Paint()..color = AppColors.forest900);

    canvas.drawCircle(Offset(w * 0.36, h * 0.90), 4, Paint()..color = AppColors.tomato500);
    canvas.drawCircle(Offset(w * 0.42, h * 0.93), 3.2, Paint()..color = AppColors.sun400);
    canvas.drawCircle(Offset(w * 0.60, h * 0.91), 4, Paint()..color = AppColors.tomato500);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// Gauge setengah lingkaran gradien merah -> kuning -> hijau + jarum (Plant Monitor)
class HealthSemiGaugeWidget extends StatelessWidget {
  const HealthSemiGaugeWidget({super.key, required this.percent, this.subtitle = 'Kesehatan kebun'});
  final int percent;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    final clamped = percent.clamp(0, 100);
    return Column(
      children: [
        TweenAnimationBuilder<double>(
          tween: Tween(begin: 0, end: clamped / 100),
          duration: const Duration(milliseconds: 900),
          curve: Curves.easeOutCubic,
          builder: (_, val, __) => SizedBox(
            width: 190,
            height: 108,
            child: CustomPaint(painter: _GaugePainter(val)),
          ),
        ),
        Text(
          '$clamped%',
          style: context.displayStyle(size: 30, color: Colors.white),
        ),
        Text(
          subtitle,
          style: TextStyle(color: Colors.white.withAlpha(205), fontSize: 13),
        ),
      ],
    );
  }
}

class _GaugePainter extends CustomPainter {
  const _GaugePainter(this.fraction);
  final double fraction;

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height - 10);
    final radius = size.width * 0.42;
    final rect = Rect.fromCircle(center: center, radius: radius);

    canvas.drawArc(
      rect,
      math.pi,
      math.pi,
      false,
      Paint()
        ..color = Colors.white.withAlpha(38)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 16
        ..strokeCap = StrokeCap.round,
    );

    canvas.drawArc(
      rect,
      math.pi,
      math.pi,
      false,
      Paint()
        ..shader = const SweepGradient(
          startAngle: math.pi,
          endAngle: math.pi * 2,
          colors: [AppColors.bad, AppColors.sun400, Color(0xFF3DBE74)],
        ).createShader(rect)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 16
        ..strokeCap = StrokeCap.round,
    );

    final angle = math.pi + (fraction * math.pi);
    final tip = Offset(
      center.dx + math.cos(angle) * (radius - 14),
      center.dy + math.sin(angle) * (radius - 14),
    );
    canvas.drawLine(
      center,
      tip,
      Paint()
        ..color = Colors.white
        ..strokeWidth = 4
        ..strokeCap = StrokeCap.round,
    );
    canvas.drawCircle(center, 8, Paint()..color = AppColors.lime300);
  }

  @override
  bool shouldRepaint(covariant _GaugePainter old) => old.fraction != fraction;
}

/// Cincin persentase Agri-cultur (stroke 8px, animasi 900ms)
class PercentageRingWidget extends StatelessWidget {
  const PercentageRingWidget({
    super.key,
    required this.percent,
    required this.label,
    required this.color,
    this.darkBg = true,
  });

  final int percent;
  final String label;
  final Color color;
  final bool darkBg;

  @override
  Widget build(BuildContext context) {
    final clamped = percent.clamp(0, 100);
    return Column(
      children: [
        TweenAnimationBuilder<double>(
          tween: Tween(begin: 0, end: clamped / 100),
          duration: const Duration(milliseconds: 900),
          curve: Curves.easeOutCubic,
          builder: (_, val, __) => SizedBox(
            width: 72,
            height: 72,
            child: Stack(
              alignment: Alignment.center,
              children: [
                CustomPaint(
                  size: const Size(72, 72),
                  painter: _RingPainter(val, color, darkBg),
                ),
                Text(
                  '$clamped%',
                  style: context.displayStyle(
                    size: 16,
                    color: darkBg ? Colors.white : context.ct.ink,
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 6),
        Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: darkBg ? Colors.white.withAlpha(215) : context.ct.inkSoft,
          ),
        ),
      ],
    );
  }
}

class _RingPainter extends CustomPainter {
  const _RingPainter(this.fraction, this.color, this.darkBg);
  final double fraction;
  final Color color;
  final bool darkBg;

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Rect.fromLTWH(4, 4, size.width - 8, size.height - 8);
    canvas.drawArc(
      rect,
      0,
      math.pi * 2,
      false,
      Paint()
        ..color = darkBg ? Colors.white.withAlpha(42) : AppColors.lineLight
        ..style = PaintingStyle.stroke
        ..strokeWidth = 8,
    );
    canvas.drawArc(
      rect,
      -math.pi / 2,
      math.pi * 2 * fraction,
      false,
      Paint()
        ..color = color
        ..style = PaintingStyle.stroke
        ..strokeWidth = 8
        ..strokeCap = StrokeCap.round,
    );
  }

  @override
  bool shouldRepaint(covariant _RingPainter old) => old.fraction != fraction || old.color != color;
}
