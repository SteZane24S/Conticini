export interface ControlloSegmentatoProps {
  nome: string;
  opzioni: { valore: string; etichetta: string }[];
  valore: string;
  onCambio: (valore: string) => void;
}

export function ControlloSegmentato({
  nome,
  opzioni,
  valore,
  onCambio,
}: ControlloSegmentatoProps) {
  return (
    <div className="seg">
      {opzioni.map((opzione) => (
        <label className="seg-opt" key={opzione.valore}>
          <input
            type="radio"
            name={nome}
            value={opzione.valore}
            checked={valore === opzione.valore}
            onChange={() => onCambio(opzione.valore)}
          />
          <span>{opzione.etichetta}</span>
        </label>
      ))}
    </div>
  );
}
