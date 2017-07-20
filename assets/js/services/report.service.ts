import socketService from "./socket.service";

namespace reportService {
	export const sendReport = (what: string, id: number) => {
		return socketService.emit("reports.add", {
			what: what,
			id: id
		})
	}
}

export default reportService
