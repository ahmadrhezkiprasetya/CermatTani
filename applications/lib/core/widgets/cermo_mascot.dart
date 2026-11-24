import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

/// Pose resmi Maskot Pak Cermat (8 pose PNG transparan tanpa bingkai)
enum CermoPose {
  wave,
  scan,
  happy,
  worried,
  water,
  thinking,
  sleep,
  bibit,
  cabai,
}

const _poseAssetMap = <CermoPose, String>{
  CermoPose.wave: 'assets/mascot/pak-cermat/03_petani_mengamati_tomat.png',
  CermoPose.scan: 'assets/mascot/pak-cermat/02_petani_memeriksa_tanaman.png',
  CermoPose.happy: 'assets/mascot/pak-cermat/08_petani_pose_jempol.png',
  CermoPose.worried: 'assets/mascot/pak-cermat/01_petani_menganalisis_daun.png',
  CermoPose.water: 'assets/mascot/pak-cermat/06_petani_menguji_sampel_tanah.png',
  CermoPose.thinking: 'assets/mascot/pak-cermat/07_petani_mencatat_hasil_pengamatan.png',
  CermoPose.sleep: 'assets/mascot/pak-cermat/05_petani_memeriksa_bibit.png',
  CermoPose.bibit: 'assets/mascot/pak-cermat/05_petani_memeriksa_bibit.png',
  CermoPose.cabai: 'assets/mascot/pak-cermat/04_petani_menganalisis_cabai.png',
};

const _cermoTips = [
  'Halo! Foto tanaman di tempat terang biar analisis AI makin tepat.',
  'Cek bagian bawah daun juga ya, bercak sering mulai dari sana.',
  'Siram pagi atau sore di pangkal batang supaya air tidak cepat menguap.',
  'Tomat setengah matang biasanya siap panen 2 sampai 4 hari lagi.',
  'Kalau hasil scan kurang yakin, foto ulang atau tanya penyuluh ya!',
  'Bersihkan daun tua yang menyentuh tanah agar jamur tidak menyebar.',
];

/// Maskot transparan Pak Cermat (100% tanpa frame kotak/lingkaran, animasi halus)
class CermoMascot extends StatefulWidget {
  const CermoMascot({
    super.key,
    this.pose = CermoPose.wave,
    this.size = 84,
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
    _ctrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 3400))..repeat();
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
    final p = context.ct;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text('Pak Cermat: $tip', style: TextStyle(color: p.ink, fontWeight: FontWeight.w600)),
          backgroundColor: p.surface,
          behavior: SnackBarBehavior.floating,
          duration: const Duration(seconds: 3),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
            side: BorderSide(color: p.line),
          ),
        ),
      );
    Future<void>.delayed(const Duration(milliseconds: 360), () {
      if (mounted) setState(() => _jumping = false);
    });
  }

  @override
  Widget build(BuildContext context) {
    final safeSize = math.max(36.0, widget.size);
    final reducedMotion = MediaQuery.maybeOf(context)?.disableAnimations ?? false;
    final assetPath = _poseAssetMap[widget.pose] ?? _poseAssetMap[CermoPose.wave]!;

    return GestureDetector(
      behavior: HitTestBehavior.translucent,
      onTap: widget.interactive ? _onTap : null,
      child: AnimatedBuilder(
        animation: _ctrl,
        builder: (_, child) {
          final t = reducedMotion ? 0.0 : _ctrl.value * 2 * math.pi;
          final bob = math.sin(t) * 2.2;
          return AnimatedScale(
            duration: const Duration(milliseconds: 220),
            curve: Curves.easeOutBack,
            scale: _jumping ? 1.07 : 1.0,
            child: Transform.translate(
              offset: Offset(0, _jumping ? -6.0 : bob),
              child: Opacity(
                opacity: widget.pose == CermoPose.sleep ? 0.8 : 1.0,
                child: child,
              ),
            ),
          );
        },
        child: Image.asset(
          assetPath,
          height: safeSize,
          fit: BoxFit.contain,
          filterQuality: FilterQuality.medium,
          semanticLabel: 'Maskot Pak Cermat',
        ),
      ),
    );
  }
}

/// Banner kebun lembut bergaya Hijau Susu × Krim Hangat (tanpa teks)
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

    canvas.drawRect(
      Offset.zero & size,
      Paint()
        ..shader = const LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xFFF9F3E4), Color(0xFFDDEEE0)],
        ).createShader(Offset.zero & size),
    );

    // Matahari pagi lembut
    canvas.drawCircle(Offset(w * 0.82, h * 0.28), h * 0.16, Paint()..color = const Color(0xFFF6D58E));

    // Bukit hijau susu
    final hill1 = Path()
      ..moveTo(0, h * 0.62)
      ..quadraticBezierTo(w * 0.28, h * 0.42, w * 0.62, h * 0.58)
      ..quadraticBezierTo(w * 0.84, h * 0.68, w, h * 0.54)
      ..lineTo(w, h)
      ..lineTo(0, h)
      ..close();
    canvas.drawPath(hill1, Paint()..color = const Color(0xFFB5DCB9));

    final hill2 = Path()
      ..moveTo(0, h * 0.76)
      ..quadraticBezierTo(w * 0.4, h * 0.62, w * 0.78, h * 0.74)
      ..quadraticBezierTo(w * 0.9, h * 0.78, w, h * 0.72)
      ..lineTo(w, h)
      ..lineTo(0, h)
      ..close();
    canvas.drawPath(hill2, Paint()..color = const Color(0xFF7EC08F));

    // Baris bedengan & titik tomat koral lembut
    for (var i = 0; i < 6; i++) {
      final cx = w * (0.12 + i * 0.15);
      final cy = h * 0.82 + (i.isEven ? 3 : -2);
      canvas.drawCircle(Offset(cx, cy), 10, Paint()..color = const Color(0xFF4A9E6E));
      canvas.drawCircle(Offset(cx + 3, cy + 2), 3.4, Paint()..color = AppColors.tomato500);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
