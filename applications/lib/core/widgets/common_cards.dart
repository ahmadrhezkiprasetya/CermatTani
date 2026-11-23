import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

/// Kartu standar CermatTani (radius 24, bayangan lembut, tanpa bingkai luar — DESIGN.md §5)
class CermatCard extends StatelessWidget {
  const CermatCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(20),
    this.color,
    this.radius = 24,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final Color? color;
  final double radius;

  @override
  Widget build(BuildContext context) {
    final p = context.ct;
    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: color ?? p.surface,
        borderRadius: BorderRadius.circular(radius),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF14302A).withAlpha(p.isDark ? 90 : 20),
            blurRadius: 22,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: child,
    );
  }
}

enum MetricCardVariant { lime, white, forest }

/// 3 Varian Kartu Metrik sesuai DESIGN.md §7 (Lime sorot, Putih, Hijau tua penekanan)
class MetricCard3 extends StatelessWidget {
  const MetricCard3({
    super.key,
    required this.label,
    required this.value,
    required this.icon,
    required this.variant,
  });

  final String label;
  final String value;
  final IconData icon;
  final MetricCardVariant variant;

  @override
  Widget build(BuildContext context) {
    final p = context.ct;
    final bg = switch (variant) {
      MetricCardVariant.lime => p.lime300,
      MetricCardVariant.white => p.surface,
      MetricCardVariant.forest => p.forest900,
    };
    final fg = switch (variant) {
      MetricCardVariant.lime => AppColors.inkLight,
      MetricCardVariant.white => p.ink,
      MetricCardVariant.forest => Colors.white,
    };
    final iconBg = switch (variant) {
      MetricCardVariant.lime => AppColors.inkLight.withAlpha(28),
      MetricCardVariant.white => p.surface2,
      MetricCardVariant.forest => Colors.white.withAlpha(34),
    };
    final iconColor = switch (variant) {
      MetricCardVariant.lime => AppColors.inkLight,
      MetricCardVariant.white => p.leaf600,
      MetricCardVariant.forest => p.lime300,
    };

    return CermatCard(
      color: bg,
      radius: 20,
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(color: iconBg, shape: BoxShape.circle),
            child: Icon(icon, size: 18, color: iconColor),
          ),
          const SizedBox(height: 10),
          Text(value, style: context.displayStyle(size: 26, color: fg)),
          const SizedBox(height: 2),
          Text(
            label,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: fg.withAlpha(220)),
          ),
        ],
      ),
    );
  }
}

/// Tombol utama 3D tipis (radius 14, bayangan bawah 6px, Fredoka 600, min 48px)
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
    final shadow = widget.tomato ? AppColors.tomatoBtnDark : p.leaf700;
    final fg = widget.tomato ? Colors.white : p.onLeaf;

    return GestureDetector(
      onTapDown: enabled ? (_) => setState(() => _pressed = true) : null,
      onTapUp: enabled ? (_) => setState(() => _pressed = false) : null,
      onTapCancel: () => setState(() => _pressed = false),
      onTap: widget.onPressed,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 120),
        transform: Matrix4.translationValues(0, _pressed ? 4 : 0, 0),
        constraints: const BoxConstraints(minHeight: 48),
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
        decoration: BoxDecoration(
          color: enabled ? fill : fill.withAlpha(120),
          borderRadius: BorderRadius.circular(14),
          boxShadow: _pressed || !enabled
              ? const []
              : [BoxShadow(color: shadow, offset: const Offset(0, 6))],
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          mainAxisSize: MainAxisSize.min,
          children: [
            if (widget.icon != null) ...[
              Icon(widget.icon, size: 20, color: fg),
              const SizedBox(width: 8),
            ],
            Flexible(
              child: Text(
                widget.label,
                overflow: TextOverflow.ellipsis,
                style: context.displayStyle(size: 16, color: fg),
              ),
            ),
          ],
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
    return OutlinedButton.icon(
      onPressed: onPressed,
      style: OutlinedButton.styleFrom(
        minimumSize: const Size(48, 48),
        foregroundColor: p.leaf600,
        backgroundColor: p.surface,
        side: BorderSide(color: p.leaf600, width: 1.5),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      ),
      icon: icon != null ? Icon(icon, size: 18) : const SizedBox.shrink(),
      label: Text(label, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
    );
  }
}

/// Pil lencana umum (radius 999px)
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
        background: AppColors.sim,
        foreground: Colors.white,
        dotColor: Colors.white,
      );

  factory CermatPill.ok(String label) => CermatPill(
        label: label,
        background: AppColors.ok.withAlpha(34),
        foreground: AppColors.leaf600,
      );

  factory CermatPill.warn(String label) => CermatPill(
        label: label,
        background: AppColors.warn.withAlpha(48),
        foreground: AppColors.warnInk,
      );

  factory CermatPill.bad(String label) => CermatPill(
        label: label,
        background: AppColors.bad.withAlpha(36),
        foreground: AppColors.bad,
      );

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 5),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (dotColor != null) ...[
            Container(
              width: 9,
              height: 9,
              decoration: BoxDecoration(color: dotColor, shape: BoxShape.circle),
            ),
            const SizedBox(width: 6),
          ],
          if (icon != null) ...[
            Icon(icon, size: 14, color: foreground),
            const SizedBox(width: 5),
          ],
          Text(
            label,
            style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: foreground),
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
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: accent.withAlpha(32),
        borderRadius: BorderRadius.circular(18),
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
                Text(title, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                const SizedBox(height: 4),
                Text(body, style: const TextStyle(fontSize: 14, height: 1.45)),
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

/// Striped Progress Bar ala Agrova Soil Health & Microclimate (DESIGN.md v1.1 §4.2 & §5)
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
            child: FractionallySizedBox(
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
    final bgPaint = Paint()..color = fillColor;
    canvas.drawRRect(
      RRect.fromRectAndRadius(Offset.zero & size, const Radius.circular(99)),
      bgPaint,
    );

    final stripePaint = Paint()
      ..color = Colors.white.withAlpha(58)
      ..strokeWidth = 3.5;

    for (double x = -size.height; x < size.width + size.height; x += 11) {
      canvas.drawLine(
        Offset(x, size.height),
        Offset(x + size.height, 0),
        stripePaint,
      );
    }
  }

  @override
  bool shouldRepaint(covariant _StripedFillPainter oldDelegate) =>
      oldDelegate.fillColor != fillColor;
}
