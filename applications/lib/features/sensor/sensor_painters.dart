import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';

class GaugePainter extends CustomPainter {
  GaugePainter(this.value);
  final double value;

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height * .82);
    final radius = math.min(size.width, size.height * 1.8) * .62;
    final rect = Rect.fromCircle(center: center, radius: radius);
    final background = Paint()
      ..color = AppColors.primaryTint
      ..style = PaintingStyle.stroke
      ..strokeWidth = 18
      ..strokeCap = StrokeCap.round;
    canvas.drawArc(rect, math.pi, math.pi, false, background);
    final active = Paint()
      ..shader = const LinearGradient(colors: [AppColors.primarySoft, AppColors.primary]).createShader(rect)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 18
      ..strokeCap = StrokeCap.round;
    canvas.drawArc(rect, math.pi, math.pi * value, false, active);
  }

  @override
  bool shouldRepaint(covariant GaugePainter oldDelegate) => oldDelegate.value != value;
}

class SmallSensor extends StatelessWidget {
  const SmallSensor(this.icon, this.value, this.label, {super.key});
  final IconData icon;
  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 92,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppColors.line),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, color: AppColors.primary),
          const SizedBox(width: 8),
          Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(value, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
              Text(label, style: const TextStyle(fontSize: 11, color: AppColors.inkMuted)),
            ],
          ),
        ],
      ),
    );
  }
}

class HistoryChart extends StatelessWidget {
  const HistoryChart({super.key});

  @override
  Widget build(BuildContext context) {
    const values = [.38, .52, .44, .66, .74, .58, .48, .42, .56, .68, .52, .46];
    return Container(
      height: 130,
      padding: const EdgeInsets.fromLTRB(12, 12, 12, 8),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppColors.line),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: List.generate(values.length, (i) {
          final selected = i == 9;
          return Expanded(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                Container(
                  width: 14,
                  height: 82 * values[i],
                  decoration: BoxDecoration(
                    color: selected ? AppColors.primary : AppColors.primarySoft,
                    borderRadius: BorderRadius.circular(999),
                  ),
                ),
                const SizedBox(height: 6),
                Text('${i + 1}', style: const TextStyle(fontSize: 9, color: AppColors.inkMuted)),
              ],
            ),
          );
        }),
      ),
    );
  }
}
