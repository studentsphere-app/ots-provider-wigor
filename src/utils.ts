import {
	CD_SCHOOLS,
	CD_SCHOOLS_TIMETABLE_ENDPOINT,
	IGENSIA_SCHOOLS_TIMETABLE_ENDPOINT,
} from "./constants";

/**
 * Determines the schedule server URL based on the school ID.
 * @param schoolId The school ID.
 * @returns The schedule server URL.
 */
export const getScheduleServer = (schoolId?: string): string => {
	if (schoolId && CD_SCHOOLS.includes(schoolId)) {
		return CD_SCHOOLS_TIMETABLE_ENDPOINT;
	}
	// Fallback to igs which also seems to support /Home/Get
	return IGENSIA_SCHOOLS_TIMETABLE_ENDPOINT;
};
