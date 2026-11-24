import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

/// Kartu standar CermatTani (radius 20, bayangan halus, hairline lembut)
class CermatCard extends StatelessWidget {
  const CermatCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(18),
    this.color,
    this.gradient,
    this.borderColor,
    this.radius = 20,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final Color? color;
  final Gradient? gradient;
  final Color? borderColor;
  final double radius;

  @override
  Widget build(BuildContext context) {
    final p = context.ct;
    return AnimatedContainer(
      duration: const Duration(milliseconds: 240),
      curve: Curves.easeOutCubic,
      padding: padding,
      decoration: BoxDecoration(
        color: gradient == null ? (color ?? p.surface) : null,
        gradient: gradient,
        borderRadius: BorderRadius.circular(radius),
        border: Border.all(color: borderColor ?? p.line.withAlpha(p.isDark ? 160 : 190)),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF2D5C44).withAlpha(p.isDark ? 55 : 14),
            blurRadius: 18,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: child,
    );
  }
}

/// Kartu Aksen Hijau Susu × Krim Hangat (pengganti kartu gelap berat)
class CermatAccentCard extends StatelessWidget {
  const CermatAccentCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(18),
    this.radius = 20,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final double radius;

  @override
  Widget build(BuildContext context) {
    final p = context.ct;
    return CermatCard(
      gradient: p.accentGradient,
      borderColor: p.leaf600.withAlpha(p.isDark ? 90 : 65),
      padding: padding,
      radius: radius,
      child: child,
    );
  }
}

enum MetricCardVariant { lime, white, forest }

/// Kartu Metrik Cerah & Seragam (Hijau Susu, Putih, Krim Hangat — tanpa blok gelap)
class MetricCard3 extends StatelessWidget {
  const MetricCard3({
    super.key,
    required this.label,
    required this.value,
    required this.icon,
    required this.variant,
    this.badge,
  });

  final String label;
  final String value;
  final IconData icon;
  final MetricCardVariant variant;
  final String? badge;

  @override
  Widget build(BuildContext context) {
    final p = context.ct;
    final bg = switch (variant) {
      MetricCardVariant.lime => p.surfaceMilk,
      MetricCardVariant.white => p.surface,
      MetricCardVariant.forest => p.creamWarm,
    };
    final iconBg = switch (variant) {
      MetricCardVariant.lime => p.surface,
      MetricCardVariant.white => p.surface2,
      MetricCardVariant.forest => p.surface,
    };
    final iconColor = switch (variant) {
      MetricCardVariant.lime => p.leaf600,
      MetricCardVariant.white => p.leaf600,
      MetricCardVariant.forest => AppColors.tomatoBtn,
    };

    return CermatCard(
      color: bg,
      radius: 18,
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                width: 34,
                height: 34,
                decoration: BoxDecoration(color: iconBg, borderRadius: BorderRadius.circular(10)),
                child: Icon(icon, size: 18, color: iconColor),
              ),
              if (badge != null)
                Flexible(
                  child: Text(
                    badge!,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: p.inkSoft),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 10),
          Text(value, style: context.displayStyle(size: 24, color: p.ink)),
          const SizedBox(height: 2),
          Text(
            label,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: p.inkSoft),
          ),
        ],
      ),
    );
  }
}

/// Tombol utama halus dengan mikro-interaksi taktil (min 46px)
class Primary3DButton extends StatefulWidget {
  const Primary3DButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.icon,
    this.tomato = false,
  });

  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final bool tomato;

  @override
  State<Primary3DButton> createState() => _Primary3DButtonState();
}

class _Primary3DButtonState extends State<Primary3DButton> {
  bool _pressed = false;

  @override
  Widget build(BuildContext context) {
    final p = context.ct;
    final enabled = widget.onPressed != null;
    final fill = widget.tomato ? AppColors.tomatoBtn : p.leaf600;
    final fg = widget.tomato ? Colors.white : p.onLeaf;

    return GestureDetector(
      onTapDown: enabled ? (_) => setState(() => _pressed = true) : null,
      onTapUp: enabled ? (_) => setState(() => _pressed = false) : null,
      onTapCancel: () => setState(() => _pressed = false),
      onTap: widget.onPressed,
      child: AnimatedScale(
        duration: const Duration(milliseconds: 140),
        curve: Curves.easeOutCubic,
        scale: _pressed ? 0.97 : 1.0,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 160),
          constraints: const BoxConstraints(minHeight: 46),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 11),
          decoration: BoxDecoration(
            color: enabled ? fill : fill.withAlpha(115),
            borderRadius: BorderRadius.circular(13),
            boxShadow: _pressed || !enabled
                ? const []
                : [
                    BoxShadow(
                      color: fill.withAlpha(65),
                      blurRadius: 14,
                      offset: const Offset(0, 5),
                    ),
                  ],
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            mainAxisSize: MainAxisSize.min,
            children: [
              if (widget.icon != null) ...[
                Icon(widget.icon, size: 19, color: fg),
                const SizedBox(width: 8),
              ],
              Flexible(
                child: Text(
                  widget.label,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 14.5,
                    fontWeight: FontWeight.w700,
                    color: fg,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class SecondaryOutlineButton extends StatelessWidget {
  const SecondaryOutlineButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.icon,
  });

  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final p = context.ct;
    return OutlinedButton(
      onPressed: onPressed,
      style: OutlinedButton.styleFrom(
        minimumSize: const Size(44, 44),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        foregroundColor: p.ink,
        backgroundColor: p.surface,
        side: BorderSide(color: p.line, width: 1.4),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(13)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 17, color: p.leaf600),
            const SizedBox(width: 6),
          ],
          Flexible(
            child: Text(
              label,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13.5),
            ),
          ),
        ],
      ),
    );
  }
}

/// Pil lencana pastel WCAG 2.2 AA
class CermatPill extends StatelessWidget {
  const CermatPill({
    super.key,
    required this.label,
    required this.background,
    required this.foreground,
    this.dotColor,
    this.icon,
  });

  final String label;
  final Color background;
  final Color foreground;
  final Color? dotColor;
  final IconData? icon;

  factory CermatPill.simulasi({String label = 'Simulasi'}) => CermatPill(
        label: label,
        background: AppColors.simBg,
        foreground: AppColors.simFg,
        dotColor: AppColors.simFg,
      );

  factory CermatPill.ok(String label) => CermatPill(
        label: label,
        background: AppColors.okBg,
        foreground: AppColors.okFg,
      );

  factory CermatPill.warn(String label) => CermatPill(
        label: label,
        background: AppColors.warnBg,
        foreground: AppColors.warnInk,
      );

  factory CermatPill.bad(String label) => CermatPill(
        label: label,
        background: AppColors.badBg,
        foreground: AppColors.badFg,
      );

  factory CermatPill.water(String label) => CermatPill(
        label: label,
        background: AppColors.waterBg,
        foreground: AppColors.waterFg,
      );

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (dotColor != null) ...[
            Container(
              width: 7,
              height: 7,
              decoration: BoxDecoration(color: dotColor, shape: BoxShape.circle),
            ),
            const SizedBox(width: 5),
          ],
          if (icon != null) ...[
            Icon(icon, size: 13, color: foreground),
            const SizedBox(width: 4),
          ],
          Text(
            label,
            style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: foreground),
          ),
        ],
      ),
    );
  }
}

class StatusAlertCard extends StatelessWidget {
  const StatusAlertCard({
    super.key,
    required this.accent,
    required this.title,
    required this.body,
    this.icon = Icons.info_outline_rounded,
    this.action,
    this.leading,
  });

  final Color accent;
  final String title;
  final String body;
  final IconData icon;
  final Widget? action;
  final Widget? leading;

  @override
  Widget build(BuildContext context) {
    final p = context.ct;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: accent.withAlpha(p.isDark ? 34 : 26),
        borderRadius: BorderRadius.circular(16),
        border: Border(left: BorderSide(color: accent, width: 4)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          leading ?? Icon(icon, color: accent, size: 22),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14.5, color: p.ink)),
                const SizedBox(height: 3),
                Text(body, style: TextStyle(fontSize: 13.5, height: 1.45, color: p.inkSoft)),
                if (action != null) ...[
                  const SizedBox(height: 10),
                  action!,
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Striped Progress Bar halus
class StripedBarWidget extends StatelessWidget {
  const StripedBarWidget({
    super.key,
    required this.label,
    required this.valueLabel,
    required this.percent,
    required this.color,
    this.darkBg = false,
  });

  final String label;
  final String valueLabel;
  final double percent;
  final Color color;
  final bool darkBg;

  @override
  Widget build(BuildContext context) {
    final p = context.ct;
    final frac = (percent / 100.0).clamp(0.05, 1.0);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Flexible(
              child: Text(
                label,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: darkBg ? Colors.white.withAlpha(220) : p.inkSoft,
                ),
              ),
            ),
            const SizedBox(width: 8),
            Text(
              valueLabel,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: darkBg ? Colors.white : p.ink,
              ),
            ),
          ],
        ),
        const SizedBox(height: 6),
        ClipRRect(
          borderRadius: BorderRadius.circular(99),
          child: Container(
            height: 11,
            width: double.infinity,
            color: darkBg ? Colors.white.withAlpha(36) : p.line,
            child: AnimatedFractionallySizedBox(
              duration: const Duration(milliseconds: 480),
              curve: Curves.easeOutCubic,
              alignment: Alignment.centerLeft,
              widthFactor: frac,
              child: CustomPaint(
                painter: _StripedFillPainter(fillColor: color),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _StripedFillPainter extends CustomPainter {
  const _StripedFillPainter({required this.fillColor});
  final Color fillColor;

  @override
  void paint(Canvas canvas, Size size) {
    canvas.drawRRect(
      RRect.fromRectAndRadius(Offset.zero & size, const Radius.circular(99)),
      Paint()..color = fillColor,
    );
    final stripePaint = Paint()
      ..color = Colors.white.withAlpha(54)
      ..strokeWidth = 3.2;
    for (double x = -size.height; x < size.width + size.height; x += 11) {
      canvas.drawLine(Offset(x, size.height), Offset(x + size.height, 0), stripePaint);
    }
  }

  @override
  bool shouldRepaint(covariant _StripedFillPainter old) => old.fillColor != fillColor;
}

class ChartPoint {
  const ChartPoint(this.label, this.value);
  final String label;
  final double value;
}

/// Grafik Area Kurva Halus (Monotone Spline) + Strip Min/Rata-rata/Maks (identik dengan versi Web)
class SmoothAreaChart extends StatefulWidget {
  const SmoothAreaChart({
    super.key,
    required this.points,
    required this.color,
    this.unit = '',
    this.height = 175,
  });

  final List<ChartPoint> points;
  final Color color;
  final String unit;
  final double height;

  @override
  State<SmoothAreaChart> createState() => _SmoothAreaChartState();
}

class _SmoothAreaChartState extends State<SmoothAreaChart> {
  int _activeIdx = 0;

  @override
  void initState() {
    super.initState();
    _activeIdx = math.max(0, widget.points.length - 1);
  }

  @override
  void didUpdateWidget(covariant SmoothAreaChart oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (_activeIdx >= widget.points.length) {
      _activeIdx = math.max(0, widget.points.length - 1);
    }
  }

  void _updateFromDx(double dx, double width) {
    if (widget.points.length <= 1) return;
    const padL = 34.0;
    const padR = 14.0;
    final usable = math.max(1.0, width - padL - padR);
    final frac = ((dx - padL) / usable).clamp(0.0, 1.0);
    final idx = (frac * (widget.points.length - 1)).round();
    if (idx != _activeIdx) {
      setState(() => _activeIdx = idx);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (widget.points.isEmpty) return const SizedBox.shrink();
    final p = context.ct;
    final vals = widget.points.map((e) => e.value).toList();
    final minV = vals.reduce(math.min);
    final maxV = vals.reduce(math.max);
    final avgV = vals.reduce((a, b) => a + b) / vals.length;
    final safeIdx = _activeIdx.clamp(0, widget.points.length - 1);
    final active = widget.points[safeIdx];

    String fmt(double v) => v == v.roundToDouble() ? v.round().toString() : v.toStringAsFixed(1);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Strip Min / Rata-rata / Maks + Titik Aktif
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            color: p.surface2,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: p.line),
          ),
          child: Wrap(
            spacing: 10,
            runSpacing: 6,
            alignment: WrapAlignment.spaceBetween,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 9,
                    height: 9,
                    decoration: BoxDecoration(color: widget.color, shape: BoxShape.circle),
                  ),
                  const SizedBox(width: 7),
                  Text(active.label, style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: p.ink)),
                  const SizedBox(width: 7),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: p.surface,
                      borderRadius: BorderRadius.circular(999),
                      border: Border.all(color: p.line),
                    ),
                    child: Text(
                      '${fmt(active.value)}${widget.unit}',
                      style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12.5, color: p.ink),
                    ),
                  ),
                ],
              ),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text('Min ${fmt(minV)}${widget.unit}  ·  ', style: TextStyle(fontSize: 11.5, color: p.inkSoft)),
                  Text('Rata ${fmt(avgV)}${widget.unit}  ·  ', style: TextStyle(fontSize: 11.5, color: p.inkSoft)),
                  Text('Maks ${fmt(maxV)}${widget.unit}', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: p.ink)),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 10),
        LayoutBuilder(
          builder: (_, constraints) {
            final width = constraints.maxWidth;
            return GestureDetector(
              onTapDown: (d) => _updateFromDx(d.localPosition.dx, width),
              onHorizontalDragUpdate: (d) => _updateFromDx(d.localPosition.dx, width),
              child: SizedBox(
                height: widget.height,
                width: width,
                child: CustomPaint(
                  painter: _SmoothAreaPainter(
                    points: widget.points,
                    color: widget.color,
                    gridColor: p.line,
                    textColor: p.inkSoft,
                    activeIdx: safeIdx,
                  ),
                ),
              ),
            );
          },
        ),
      ],
    );
  }
}

class _SmoothAreaPainter extends CustomPainter {
  const _SmoothAreaPainter({
    required this.points,
    required this.color,
    required this.gridColor,
    required this.textColor,
    required this.activeIdx,
  });

  final List<ChartPoint> points;
  final Color color;
  final Color gridColor;
  final Color textColor;
  final int activeIdx;

  @override
  void paint(Canvas canvas, Size size) {
    if (points.isEmpty) return;
    const padL = 34.0;
    const padR = 14.0;
    const padT = 14.0;
    const padB = 26.0;
    final innerW = math.max(1.0, size.width - padL - padR);
    final innerH = math.max(1.0, size.height - padT - padB);
    final baseY = padT + innerH;

    final values = points.map((e) => e.value).toList();
    final rawMin = values.reduce(math.min);
    final rawMax = values.reduce(math.max);
    final rawSpan = math.max(rawMax - rawMin, 2.0);
    final pMin = math.max(0.0, (rawMin - rawSpan * 0.14).floorToDouble());
    final pMax = (rawMax + rawSpan * 0.16).ceilToDouble();
    final span = math.max(pMax - pMin, 1.0);

    final coords = <Offset>[];
    for (var i = 0; i < points.length; i++) {
      final x = padL + (points.length == 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
      final y = padT + innerH - ((points[i].value - pMin) / span) * innerH;
      coords.add(Offset(x, y));
    }

    // Garis grid horizontal & label Y
    final gridPaint = Paint()
      ..color = gridColor
      ..strokeWidth = 1;
    for (final frac in [0.0, 0.5, 1.0]) {
      final y = padT + innerH * frac;
      canvas.drawLine(Offset(padL, y), Offset(size.width - padR, y), gridPaint);
      final labelVal = (pMax - span * frac).round();
      final tp = TextPainter(
        text: TextSpan(
          text: '$labelVal',
          style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w600, color: textColor),
        ),
        textDirection: TextDirection.ltr,
      )..layout();
      tp.paint(canvas, Offset(padL - tp.width - 6, y - tp.height / 2));
    }

    // Kurva Monotone Cubic Bezier
    final linePath = Path()..moveTo(coords.first.dx, coords.first.dy);
    if (coords.length == 2) {
      linePath.lineTo(coords.last.dx, coords.last.dy);
    } else if (coords.length > 2) {
      final n = coords.length;
      final dx = List<double>.generate(n - 1, (i) => math.max(1.0, coords[i + 1].dx - coords[i].dx));
      final sec = List<double>.generate(n - 1, (i) => (coords[i + 1].dy - coords[i].dy) / dx[i]);
      final m = List<double>.filled(n, 0);
      m[0] = sec[0];
      m[n - 1] = sec[n - 2];
      for (var i = 1; i < n - 1; i++) {
        if (sec[i - 1] * sec[i] <= 0) {
          m[i] = 0;
        } else {
          final avg = (sec[i - 1] + sec[i]) / 2;
          final lim = 2.6 * math.min(sec[i - 1].abs(), sec[i].abs());
          m[i] = avg.sign * math.min(avg.abs(), lim);
        }
      }
      for (var i = 0; i < n - 1; i++) {
        final p0 = coords[i];
        final p1 = coords[i + 1];
        final sdx = dx[i];
        linePath.cubicTo(
          p0.dx + sdx / 3,
          p0.dy + (m[i] * sdx) / 3,
          p1.dx - sdx / 3,
          p1.dy - (m[i + 1] * sdx) / 3,
          p1.dx,
          p1.dy,
        );
      }
    }

    // Area gradien pastel (tidak pernah hitam!)
    if (coords.length > 1) {
      final areaPath = Path.from(linePath)
        ..lineTo(coords.last.dx, baseY)
        ..lineTo(coords.first.dx, baseY)
        ..close();
      final areaPaint = Paint()
        ..shader = LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [color.withAlpha(78), color.withAlpha(24), color.withAlpha(3)],
        ).createShader(Rect.fromLTRB(padL, padT, size.width - padR, baseY));
      canvas.drawPath(areaPath, areaPaint);
    }

    // Garis kurva utama
    canvas.drawPath(
      linePath,
      Paint()
        ..color = color
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2.8
        ..strokeCap = StrokeCap.round
        ..strokeJoin = StrokeJoin.round,
    );

    // Crosshair vertikal titik aktif
    final activePt = coords[activeIdx.clamp(0, coords.length - 1)];
    final dashPaint = Paint()
      ..color = color.withAlpha(100)
      ..strokeWidth = 1.4;
    for (double y = padT; y < baseY; y += 7) {
      canvas.drawLine(Offset(activePt.dx, y), Offset(activePt.dx, math.min(y + 4, baseY)), dashPaint);
    }

    // Titik data & label sumbu X
    final step = math.max(1, (coords.length / 5).ceil());
    for (var i = 0; i < coords.length; i++) {
      final pt = coords[i];
      final isAct = i == activeIdx;
      if (isAct) {
        canvas.drawCircle(pt, 10, Paint()..color = color.withAlpha(46));
        canvas.drawCircle(pt, 5.2, Paint()..color = Colors.white);
        canvas.drawCircle(
          pt,
          5.2,
          Paint()
            ..color = color
            ..style = PaintingStyle.stroke
            ..strokeWidth = 2.6,
        );
      } else {
        canvas.drawCircle(pt, 3.2, Paint()..color = color);
      }

      if (i % step == 0 || i == coords.length - 1) {
        final tp = TextPainter(
          text: TextSpan(
            text: points[i].label,
            style: TextStyle(
              fontSize: 10.5,
              fontWeight: isAct ? FontWeight.w700 : FontWeight.w500,
              color: isAct ? color : textColor,
            ),
          ),
          textDirection: TextDirection.ltr,
        )..layout();
        tp.paint(canvas, Offset((pt.dx - tp.width / 2).clamp(padL, size.width - tp.width - 4), baseY + 7));
      }
    }
  }

  @override
  bool shouldRepaint(covariant _SmoothAreaPainter old) =>
      old.points != points || old.color != color || old.activeIdx != activeIdx;
}
