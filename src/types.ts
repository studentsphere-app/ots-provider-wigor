export interface WigorEventJSON {
	Commentaire: string | null;
	NoCours: number;
	NoGroupe: number;
	LibelleGroupe: string | null;
	LibelleSemaine: string | null;
	Matiere: string | null;
	Salles: string | null;
	NomEcole: string | null;
	LogoEcole: string | null;
	CoursMixtePicto: string | null;
	CoursMixteInfoBulle: string | null;
	FondCour: string | null;
	NomProf: string | null;
	Duree: number | null;
	RecurrenceRule: string | null;
	RecurrenceID: string | null;
	RecurrenceException: string | null;
	IsAllDay: boolean;
	Title: string | null;
	Description: string | null;
	Start: string;
	StartTimezone: string | null;
	End: string;
	EndTimezone: string | null;
	TeamsURL: string | null;
	TeamsUrl: string | null;
	ColorRed: number;
	ColorGreen: number;
	ColorBlue: number;
	Origine: number;
	LienTrack: string | null;
}

export interface School {
	id: string;
	name: string;
	logo: string;
}
