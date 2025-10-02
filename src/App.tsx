import { Router, Route } from "@solidjs/router";
import Home from "./pages/Home";
import Shader from "./pages/Shader";

export default function App() {
	return (
		<Router>
			<Route path="/" component={Home} />
			<Route path="/shader" component={Shader} />
		</Router>
	);
}
