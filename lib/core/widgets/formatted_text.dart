import 'package:flutter/material.dart';

/// Merender teks AI (Chatbot, Ringkasan Scan, Temuan Visual) secara rapi:
/// - `**teks**` atau `__teks__` -> teks tebal sungguhan (tidak pernah muncul `**` mentah)
/// - `*teks*` -> teks miring
/// - Baris bullet `- ` / `* ` / `• ` -> daftar poin bersih
class FormattedText extends StatelessWidget {
  const FormattedText(
    this.text, {
    super.key,
    this.style,
    this.textAlign = TextAlign.start,
  });

  final String text;
  final TextStyle? style;
  final TextAlign textAlign;

  static final RegExp _inlineRegex = RegExp(
    r'\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|\*\*([^*]+)\*\*|__([^_]+)__|\*([^*\n]+)\*',
  );

  List<InlineSpan> _parseInline(String line, TextStyle base) {
    final spans = <InlineSpan>[];
    var last = 0;

    for (final match in _inlineRegex.allMatches(line)) {
      if (match.start > last) {
        final plain = line.substring(last, match.start).replaceAll('**', '');
        if (plain.isNotEmpty) {
          spans.add(TextSpan(text: plain, style: base));
        }
      }

      if (match.group(1) != null && match.group(2) != null) {
        spans.add(
          TextSpan(
            text: match.group(1),
            style: base.copyWith(
              fontWeight: FontWeight.w700,
              decoration: TextDecoration.underline,
            ),
          ),
        );
      } else if (match.group(3) != null || match.group(4) != null) {
        final boldText = (match.group(3) ?? match.group(4) ?? '').replaceAll('**', '');
        spans.add(
          TextSpan(
            text: boldText,
            style: base.copyWith(fontWeight: FontWeight.w700),
          ),
        );
      } else if (match.group(5) != null) {
        spans.add(
          TextSpan(
            text: match.group(5),
            style: base.copyWith(fontStyle: FontStyle.italic),
          ),
        );
      }

      last = match.end;
    }

    if (last < line.length) {
      final rest = line.substring(last).replaceAll('**', '');
      if (rest.isNotEmpty) {
        spans.add(TextSpan(text: rest, style: base));
      }
    }

    if (spans.isEmpty) {
      spans.add(TextSpan(text: line.replaceAll('**', ''), style: base));
    }
    return spans;
  }

  @override
  Widget build(BuildContext context) {
    final clean = text.replaceAll('\r\n', '\n').trim();
    if (clean.isEmpty) return const SizedBox.shrink();

    final baseStyle = style ?? DefaultTextStyle.of(context).style;
    final lines = clean.split('\n');

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        for (var i = 0; i < lines.length; i++) ...[
          if (i > 0) const SizedBox(height: 4),
          _buildLine(lines[i].trim(), baseStyle),
        ],
      ],
    );
  }

  Widget _buildLine(String line, TextStyle base) {
    if (line.isEmpty) return const SizedBox(height: 4);

    final headingMatch = RegExp(r'^#{1,4}\s+(.+)$').firstMatch(line);
    if (headingMatch != null) {
      return Text.rich(
        TextSpan(children: _parseInline(headingMatch.group(1)!, base.copyWith(fontWeight: FontWeight.w700))),
        textAlign: textAlign,
      );
    }

    final bulletMatch = RegExp(r'^[-*•]\s+(.+)$').firstMatch(line);
    if (bulletMatch != null) {
      return Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('•  ', style: base.copyWith(fontWeight: FontWeight.w700)),
          Expanded(
            child: Text.rich(
              TextSpan(children: _parseInline(bulletMatch.group(1)!, base)),
              textAlign: textAlign,
            ),
          ),
        ],
      );
    }

    final numMatch = RegExp(r'^(\d+\.)\s+(.+)$').firstMatch(line);
    if (numMatch != null) {
      return Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('${numMatch.group(1)} ', style: base.copyWith(fontWeight: FontWeight.w700)),
          Expanded(
            child: Text.rich(
              TextSpan(children: _parseInline(numMatch.group(2)!, base)),
              textAlign: textAlign,
            ),
          ),
        ],
      );
    }

    return Text.rich(
      TextSpan(children: _parseInline(line, base)),
      textAlign: textAlign,
    );
  }
}
