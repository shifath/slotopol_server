package slot

// Symbol defines the metadata for a game symbol.
type Symbol struct {
	ID          Sym
	Name        string
	DisplayChar rune   // A character to represent the symbol, replacing images.
	ImagePath   string // Path to the symbol's image file.
	// Add other metadata here as needed, e.g., Color string, AssetPath string (for placeholders)
}

// Symbols is a global registry of all defined symbols.
// It maps Sym (integer ID) to its Symbol metadata.
var Symbols = make(map[Sym]Symbol)

func init() {
	// Register some common/default symbols here if applicable across all games.
	// For now, it will be populated by individual game rule files.
}

// GetSymbol retrieves Symbol metadata by its ID.
func GetSymbol(id Sym) (Symbol, bool) {
	sym, ok := Symbols[id]
	return sym, ok
}