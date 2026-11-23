import 'dart:async';
import 'dart:io';

abstract interface class TomatoDetectionService {
  Future<List<DetectionResult>> detect(File image);
}

abstract interface class LeafDiseaseService {
  Future<DiseaseResult> diagnose(File image);
}

abstract interface class ChatbotService {
  Future<String> ask(String question, {String context = ''});
}

abstract interface class SensorService {
  Stream<SensorReading> stream();
}

abstract interface class TelegramService {
  Future<void> send(String message);
}

class DetectionResult {
  const DetectionResult(this.label, this.confidence);
  final String label;
  final double confidence;
}

class DiseaseResult {
  const DiseaseResult(this.name, this.confidence);
  final String name;
  final double confidence;
}

class SensorReading {
  const SensorReading(this.moisture, this.temperature, this.airHumidity, this.pumpActive);
  final int moisture;
  final int temperature;
  final int airHumidity;
  final bool pumpActive;
}

class MockTomatoDetectionService implements TomatoDetectionService {
  @override
  Future<List<DetectionResult>> detect(File image) async {
    await Future<void>.delayed(const Duration(milliseconds: 1100));
    return const [
      DetectionResult('matang', .96),
      DetectionResult('setengah_matang', .82),
      DetectionResult('mentah', .89),
    ];
  }
}

class MockLeafDiseaseService implements LeafDiseaseService {
  @override
  Future<DiseaseResult> diagnose(File image) async {
    await Future<void>.delayed(const Duration(milliseconds: 1200));
    return const DiseaseResult('Hawar Daun / Late Blight', .91);
  }
}

class MockChatbotService implements ChatbotService {
  @override
  Future<String> ask(String question, {String context = ''}) async {
    await Future<void>.delayed(const Duration(milliseconds: 900));
    if (question.contains('Pupuk')) {
      return 'Prioritaskan Kalium moderat dan pastikan Kalsium tersedia.';
    }
    return 'Buang daun terinfeksi, kurangi kelembapan, dan periksa sirkulasi udara.';
  }
}

class MockSensorService implements SensorService {
  @override
  Stream<SensorReading> stream() async* {
    yield const SensorReading(48, 27, 68, false);
  }
}

class MockTelegramService implements TelegramService {
  @override
  Future<void> send(String message) async {
    await Future<void>.delayed(const Duration(milliseconds: 500));
  }
}
