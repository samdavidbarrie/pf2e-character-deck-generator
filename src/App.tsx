import { useAppStore } from "./app/store";
import { ImportScreen } from "./ui/ImportScreen";
import { DeckBuilder } from "./ui/DeckBuilder";
import { PrintPreview } from "./ui/PrintPreview";

export default function App() {
  const screen = useAppStore((s) => s.screen);

  return (
    <>
      {screen === "import" && <ImportScreen />}
      {screen === "deck-builder" && <DeckBuilder />}
      {screen === "print-preview" && <PrintPreview />}
    </>
  );
}
