import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:cermat_tani/app.dart';

void main() {
  testWidgets('CermatTani app smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const ProviderScope(child: CermatTaniApp()));
    await tester.pump();
    expect(find.byType(CermatTaniApp), findsOneWidget);
  });
}
