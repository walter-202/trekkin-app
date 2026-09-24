import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
} from "react-native";
import { CHECKPOINT_CATEGORY_VALUES } from "../../../core/domain/activity.schemas";
import type { CheckpointCategory } from "../../../core/domain/types";
import { AndeanTheme } from "../../theme";

const CATEGORY_LABEL: Record<CheckpointCategory, string> = {
  agua: "Agua",
  camping: "Camping",
  peligro: "Peligro",
  vista: "Vista",
  descanso: "Descanso",
  flora_fauna: "Flora/fauna",
  refugio: "Refugio",
};

interface AddCheckpointModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (input: {
    name: string;
    category: CheckpointCategory;
    notes?: string;
  }) => Promise<boolean>;
}

/**
 * HU-08 C2 / HU-06 C3 — Alta manual de parada (categoría Zod, nota opcional).
 */
export const AddCheckpointModal: React.FC<AddCheckpointModalProps> = ({
  visible,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<CheckpointCategory>("vista");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setName("");
    setCategory("vista");
    setNotes("");
    setError(null);
    setSaving(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const ok = await onSubmit({
        name: name.trim(),
        category,
        notes: notes.trim() || undefined,
      });
      if (ok) {
        reset();
        onClose();
      } else {
        setError("No se pudo registrar la parada.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Datos de parada inválidos.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <ScrollView
          style={styles.card}
          contentContainerStyle={styles.cardContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Nueva parada</Text>
          <Text style={styles.hint}>
            Se guarda en tu posición GPS actual. Nombre y categoría son
            obligatorios.
          </Text>

          <Text style={styles.label}>NOMBRE</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Vertiente, mirador…"
            placeholderTextColor={AndeanTheme.colors.fieldHint}
            style={styles.input}
            maxLength={100}
            accessibilityLabel="Nombre de la parada"
          />

          <Text style={styles.label}>CATEGORÍA</Text>
          <View style={styles.chips}>
            {CHECKPOINT_CATEGORY_VALUES.map((id) => {
              const active = category === id;
              return (
                <Pressable
                  key={id}
                  onPress={() => setCategory(id)}
                  style={[styles.chip, active && styles.chipActive]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {CATEGORY_LABEL[id]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.label}>NOTA (OPCIONAL)</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Agua filtrable, viento fuerte…"
            placeholderTextColor={AndeanTheme.colors.fieldHint}
            style={[styles.input, styles.notes]}
            maxLength={1000}
            multiline
            accessibilityLabel="Nota de la parada"
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.actions}>
            <Pressable
              onPress={handleClose}
              style={styles.cancelBtn}
              accessibilityRole="button"
            >
              <Text style={styles.cancelText}>CANCELAR</Text>
            </Pressable>
            <Pressable
              onPress={handleSave}
              disabled={saving || name.trim().length === 0}
              style={[
                styles.saveBtn,
                (saving || name.trim().length === 0) && styles.saveDisabled,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Guardar parada"
            >
              <Text style={styles.saveText}>GUARDAR</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    maxHeight: "90%",
    backgroundColor: AndeanTheme.colors.sheet,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.fieldBorder,
    borderRadius: 20,
  },
  cardContent: { padding: 20, gap: 8 },
  title: { color: AndeanTheme.colors.ink, fontSize: 16, fontWeight: "900" },
  hint: { color: AndeanTheme.colors.inkSecondary, fontSize: 12, lineHeight: 17, marginBottom: 4 },
  label: {
    color: AndeanTheme.colors.fieldLabel,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginTop: 6,
  },
  input: {
    backgroundColor: AndeanTheme.colors.field,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.fieldBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: AndeanTheme.colors.ink,
    fontSize: 13,
  },
  notes: { minHeight: 72, textAlignVertical: "top" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: AndeanTheme.colors.fieldBorder,
    backgroundColor: AndeanTheme.colors.field,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipActive: { borderColor: AndeanTheme.colors.successBorder, backgroundColor: AndeanTheme.colors.successBg },
  chipText: { color: AndeanTheme.colors.inkSecondary, fontSize: 11, fontWeight: "700" },
  chipTextActive: { color: AndeanTheme.colors.primaryDark },
  error: { color: AndeanTheme.colors.errorText, fontSize: 11 },
  actions: { flexDirection: "row", gap: 10, marginTop: 10 },
  cancelBtn: {
    flex: 1,
    alignItems: "center",
    backgroundColor: AndeanTheme.colors.field,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.fieldBorder,
    borderRadius: 14,
    paddingVertical: 12,
  },
  cancelText: { color: AndeanTheme.colors.inkSecondary, fontSize: 11, fontWeight: "800" },
  saveBtn: {
    flex: 1,
    alignItems: "center",
    backgroundColor: AndeanTheme.colors.cta,
    borderRadius: 14,
    paddingVertical: 12,
  },
  saveDisabled: { opacity: 0.4 },
  saveText: { color: AndeanTheme.colors.white, fontSize: 11, fontWeight: "800" },
});
