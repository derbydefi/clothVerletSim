class ClothParticle {
	constructor(x, y, id, mass = 20) {
		this.id = id;
		this.currPos = { x, y };
		this.prevPos = { x, y };
		this.acceleration = { x: 0, y: 0 };
		this.pinned = false;
		this.mass = mass;
	}

	applyForce(force) {
		this.acceleration.x += force.x / this.mass;
		this.acceleration.y += force.y / this.mass;
	}

	// Pin the particle to its current position
	pin() {
		this.pinned = true;
	}

	update(dt) {
		if (this.pinned) return;

		let velocity = {
			x: this.currPos.x - this.prevPos.x,
			y: this.currPos.y - this.prevPos.y,
		};

		this.prevPos.x = this.currPos.x;
		this.prevPos.y = this.currPos.y;

		this.currPos.x += velocity.x + this.acceleration.x * dt * dt;
		this.currPos.y += velocity.y + this.acceleration.y * dt * dt;

		// Reset acceleration
		this.acceleration.x = 0;
		this.acceleration.y = 0;
	}
}

class Constraint {
	static tearThreshold = 150;
	constructor(p1, p2, restLength, simulation) {
		this.p1 = p1;
		this.p2 = p2;
		this.restLength = restLength;
		this.isBroken = false;
		this.simulation = simulation;
	}
	propagateTearing() {
		// Directly work with the constraints list from the simulation
		this.simulation.constraints.forEach((constraint) => {
			if (constraint.isBroken) return;

			const involvesP1 = constraint.p1 === this.p1 || constraint.p2 === this.p1;
			const involvesP2 = constraint.p1 === this.p2 || constraint.p2 === this.p2;

			if (involvesP1 || involvesP2) {
				let dx = constraint.p2.currPos.x - constraint.p1.currPos.x;
				let dy = constraint.p2.currPos.y - constraint.p1.currPos.y;
				let distance = Math.sqrt(dx * dx + dy * dy);

				if (distance > constraint.restLength * 0.9) {
					// Your logic for tearing
					constraint.isBroken = true;
				}
			}
		});
	}

	satisfy() {
		if (this.isBroken) return;

		let dx = this.p2.currPos.x - this.p1.currPos.x;
		let dy = this.p2.currPos.y - this.p1.currPos.y;
		let dist = Math.sqrt(dx * dx + dy * dy);
		if (dist > Constraint.tearThreshold) {
			this.isBroken = true;
			console.log("isbroken true for", this.p1, this.p2);
			this.propagateTearing(); // Check for tear propagation when breaking

			return;
		}
		let diff = (dist - this.restLength) / dist;

		if (!this.p1.pinned) {
			this.p1.currPos.x += dx * diff * 0.5;
			this.p1.currPos.y += dy * diff * 0.5;
		}

		if (!this.p2.pinned) {
			this.p2.currPos.x -= dx * diff * 0.5;
			this.p2.currPos.y -= dy * diff * 0.5;
		}
	}
}

class ClothSimulation {
	constructor(width, height, particleDistance, gravity) {
		this.width = width;
		this.height = height;
		this.particleDistance = particleDistance;
		this.gravity = gravity;
		this.particles = [];
		this.constraints = [];

		this.init();
	}

	init() {
		// Initialize particles in a grid
		for (let y = 0; y < this.height; y++) {
			for (let x = 0; x < this.width; x++) {
				const posX = x * this.particleDistance;
				const posY = y * this.particleDistance;
				this.particles.push(new ClothParticle(posX, posY, x + y * this.width)); // Assuming each particle gets a unique ID
			}
		}

		// Initialize constraints between adjacent particles
		for (let y = 0; y < this.height; y++) {
			for (let x = 0; x < this.width; x++) {
				const index = x + y * this.width;
				if (x < this.width - 1) {
					// Create horizontal constraint
					let newConstraint = new Constraint(
						this.particles[index],
						this.particles[index + 1],
						this.particleDistance,
						this // Pass this simulation instance to the constraint
					);
					this.constraints.push(newConstraint);
				}
				if (y < this.height - 1) {
					// Create vertical constraint
					let newConstraint = new Constraint(
						this.particles[index],
						this.particles[index + this.width],
						this.particleDistance,
						this // Pass this simulation instance to the constraint
					);
					this.constraints.push(newConstraint);
				}
			}
		}
	}
	addForce(force) {
		this.particles.forEach((p) => p.applyForce(force));
	}

	update(dt) {
		// Apply gravity directly within the update to avoid redundant force application
		const gravity = { x: 0, y: this.gravity * dt * dt }; // Pre-multiply by dt^2 for direct application

		for (let i = 0, len = this.particles.length; i < len; i++) {
			const p = this.particles[i];
			if (!p.pinned) {
				let velocity = {
					x: p.currPos.x - p.prevPos.x,
					y: p.currPos.y - p.prevPos.y,
				};

				// Apply gravity directly here
				p.prevPos.x = p.currPos.x;
				p.prevPos.y = p.currPos.y;
				p.currPos.x += velocity.x + gravity.x;
				p.currPos.y += velocity.y + gravity.y;
			}
		}

		// Assuming constraint satisfaction is needed once per update
		for (let i = 0, len = this.constraints.length; i < len; i++) {
			this.constraints[i].satisfy();
		}
	}
	// This function checks if a constraint between two given particles is active.
	isConstraintActive(particleA, particleB) {
		return true;
		// Iterate through all constraints in the simulation.
		return this.constraints.some((constraint) => {
			// Check if particleA is part of the constraint.
			const involvesA =
				constraint.p1.id === particleA.id || constraint.p2.id === particleA.id;
			// Check if particleB is part of the constraint.
			const involvesB =
				constraint.p1.id === particleB.id || constraint.p2.id === particleB.id;
			// Determine if the constraint is active (i.e., involves both particles and is not broken).
			const isActive = involvesA && involvesB && !constraint.isBroken;

			// Log the check and the involved particles for debugging purposes.
			//console.log(`Checking Constraint:`, {constraintId: constraint.id, involvesA, involvesB, isActive, isBroken: constraint.isBroken});

			// Return true if the constraint is active, causing the some() method to stop iteration and return true.
			return isActive;
		});
		// If no active constraint is found between the two particles, some() returns false.
	}
}

class ClothGame {
	constructor() {
		this.addEventListeners();
		this.gravity = document.getElementById("gravity").value;
		this.dt = document.getElementById("timeStep").value;
		this.width = parseInt(document.getElementById("clothWidth").value);
		this.height = parseInt(document.getElementById("clothHeight").value);
		this.clothColor = document.getElementById("clothColor").value;
		this.clothColor2 = document.getElementById("clothColor2").value;
		this.particleDistance = parseInt(
			document.getElementById("particleDistance").value
		);
		this.simulation = new ClothSimulation(25, 10, 25, this.gravity); // Example dimensions

		this.initCanvas();
		this.initMouseHandling();
		this.tearThreshold = document.getElementById("tearThreshold").value;

		this.currentMode = "drag"; // Default interaction mode
		this.isMouseDown = false; // Track if the mouse is pressed
		this.showFilledMesh = true;
		this.initInteractionModeSelector();
		document
			.getElementById("filledMeshToggle")
			.addEventListener("change", (event) => {
				this.showFilledMesh = event.target.checked;
			});
	}
	initInteractionModeSelector() {
		// Set up event listener for the interaction mode selector
		document
			.getElementById("interactionMode")
			.addEventListener("change", (event) => {
				this.currentMode = event.target.value;
			});
	}
	initCanvas() {
		this.canvas = document.createElement("canvas");
		this.ctx = this.canvas.getContext("2d");
		document.body.appendChild(this.canvas);
		this.canvas.width = 600; // Adjust as needed
		this.canvas.height = 400; // Adjust as needed
	}

	initMouseHandling() {
		let dragStart = null;
		let draggedParticle = null;

		this.canvas.onmousedown = (event) => {
			const mousePos = this.getMousePos(event);
			const particle = this.findClosestParticle(mousePos.x, mousePos.y);
			// Prioritize dragging if we're in drag mode and the particle isn't pinned
			if (this.currentMode === "drag" && particle && !particle.pinned) {
				this.isMouseDown = true;
				particle.isGrabbed = true; // Assuming isGrabbed flag exists and is handled in your update logic
				draggedParticle = particle;
			} else {
				// If we're not in drag mode or didn't click a draggable particle, handle other actions
				this.handleMouseAction(event, "click");
			}
		};

		this.canvas.onmousemove = (event) => {
			if (!this.isMouseDown || !draggedParticle) return;
			const mousePos = this.getMousePos(event);
			// Continue dragging logic here if a particle is being dragged
			if (draggedParticle && draggedParticle.isGrabbed) {
				draggedParticle.currPos.x = mousePos.x;
				draggedParticle.currPos.y = mousePos.y;
			}
		};

		this.canvas.onmouseup = (event) => {
			if (draggedParticle) {
				draggedParticle.isGrabbed = false;
				this.isMouseDown = false;
				draggedParticle = null;
			} else {
				// Handle mouse up action if needed, for instance, finalizing a cut or pin action
				// This might not be necessary depending on your interaction design
				this.handleMouseAction(event, "mouseup");
			}
		};
	}

	getMousePos(event) {
		const rect = this.canvas.getBoundingClientRect();
		return {
			x: event.clientX - rect.left,
			y: event.clientY - rect.top,
		};
	}

	handleMouseAction(event, actionType) {
		const mousePos = this.getMousePos(event);

		switch (this.currentMode) {
			case "cut":
				if (actionType === "click" || "drag") {
					// Assuming 'cut' should happen on click
					this.cutFabric(mousePos.x, mousePos.y);
				}
				break;
			case "pin":
				if (actionType === "click") {
					// Assuming 'pin' should also happen on click
					this.togglePin(mousePos.x, mousePos.y);
				}
				break;
		}
	}

	findClosestParticle(x, y) {
		let closestParticle = null;
		let minDistance = Infinity;
		this.simulation.particles.forEach((p) => {
			const distance = Math.sqrt(
				Math.pow(p.currPos.x - x, 2) + Math.pow(p.currPos.y - y, 2)
			);
			if (distance < minDistance) {
				closestParticle = p;
				minDistance = distance;
			}
		});
		return closestParticle;
	}

	tearParticle(particle) {
		// Implementing the actual "tear" might involve more than just marking a particle
		// For example, you could remove constraints to simulate the effect of tearing
		// This is a placeholder for whatever tearing logic you decide to implement
		particle.isTorn = true; // This is a new property you'd have to handle in your rendering/logic

		// Remove constraints involving this particle to simulate tearing
		this.simulation.constraints = this.simulation.constraints.filter(
			(c) => c.p1 !== particle && c.p2 !== particle
		);

		// You might need additional logic here to handle the aftermath of tearing,
		// such as creating new particles/constraints to simulate a tear visually.
	}

	togglePin(x, y) {
		// Implement toggling pin state based on proximity to mouse click
		this.simulation.particles.forEach((p) => {
			const dx = p.currPos.x - x;
			const dy = p.currPos.y - y;
			if (Math.sqrt(dx * dx + dy * dy) < 10) {
				// Threshold for clicking
				p.pinned = !p.pinned;
			}
		});
	}

	cutFabric(x, y) {
		// Logic to "cut" the fabric by removing constraints
		// This is a simplified approach to illustrate the concept
		const cutRadius = 10; // Define a radius within which to cut constraints
		this.simulation.constraints = this.simulation.constraints.filter((c) => {
			const midPointX = (c.p1.currPos.x + c.p2.currPos.x) / 2;
			const midPointY = (c.p1.currPos.y + c.p2.currPos.y) / 2;
			const distance = Math.sqrt(
				Math.pow(midPointX - x, 2) + Math.pow(midPointY - y, 2)
			);
			return distance > cutRadius; // Keep constraints outside the cut radius
		});
	}

	addEventListeners() {
		// Restart simulation button
		document
			.getElementById("restartSimulation")
			.addEventListener("click", () => {
				const pinCorners = document.getElementById("togglePins").checked;
				this.restartSimulation(pinCorners);
			});

		document
			.getElementById("tearThreshold")
			.addEventListener("change", (event) => {
				this.tearThreshold = event.target.value;
				Constraint.tearThreshold = this.tearThreshold; // Update the static property of Constraint
			});

		document.getElementById("gravity").addEventListener("change", (event) => {
			this.gravity = event.target.value;
		});

		document.getElementById("timeStep").addEventListener("change", (event) => {
			this.dt = event.target.value;
		});
		document
			.getElementById("clothWidth")
			.addEventListener("change", (event) => {
				this.width = event.target.value;
			});
		document
			.getElementById("clothHeight")
			.addEventListener("change", (event) => {
				this.height = event.target.value;
			});
		document
			.getElementById("particleDistance")
			.addEventListener("change", (event) => {
				this.particleDistance = event.target.value;
			});

		document
			.getElementById("clothColor")
			.addEventListener("change", (event) => {
				this.clothColor = event.target.value;
				// Optionally, force a re-render if needed
				this.render();
			});
		document
			.getElementById("clothColor2")
			.addEventListener("change", (event) => {
				this.clothColor2 = event.target.value;
				// Optionally, force a re-render if needed
				this.render();
			});
	}
	restartSimulation(pinCorners) {
		// Extract existing parameters if needed
		this.gravity = parseFloat(document.getElementById("gravity").value);
		this.dt = parseFloat(document.getElementById("timeStep").value);
		this.width = parseInt(document.getElementById("clothWidth").value, 10);
		this.height = parseInt(document.getElementById("clothHeight").value, 10);
		this.particleDistance = parseInt(
			document.getElementById("particleDistance").value,
			10
		);
		this.tearThreshold = parseFloat(
			document.getElementById("tearThreshold").value
		);
		Constraint.tearThreshold = this.tearThreshold; // Ensure the tear threshold is updated globally

		// Re-initialize the simulation with new dimensions, particle distance, and gravity
		this.simulation = new ClothSimulation(
			this.width,
			this.height,
			this.particleDistance,
			this.gravity
		);

		// Optionally apply initial pins to the top corners
		if (pinCorners) {
			this.pinTopCorners();
		}

		// Since we're restarting, clear the canvas and restart the loop if needed
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

		// Note: Depending on your loop implementation, you may need to ensure it's not duplicated
	}

	pinTopCorners() {
		// Assuming your particles are stored in a row-major order
		this.simulation.particles[0].pin(); // Top left
		this.simulation.particles[this.simulation.width - 1].pin(); // Top right
	}

	handleMouseDown(event) {
		const rect = this.canvas.getBoundingClientRect();
		const scaleX = this.canvas.width / rect.width;
		const scaleY = this.canvas.height / rect.height;
		const x = (event.clientX - rect.left) * scaleX;
		const y = (event.clientY - rect.top) * scaleY;

		// Find the nearest particle and toggle its pinned state
		this.simulation.particles.forEach((p) => {
			const dx = p.currPos.x - x;
			const dy = p.currPos.y - y;
			if (Math.sqrt(dx * dx + dy * dy) < 10) {
				// Threshold for clicking
				p.pinned = !p.pinned;
			}
		});
	}

	loop = () => {
		requestAnimationFrame(this.loop);
		const dt = 1 / this.dt;
		this.simulation.update(dt);
		this.render();
	};
	drawFilledTriangle(p1, p2, p3) {
		// Calculate distances between each pair of particles
		let d1 = Math.hypot(
			p2.currPos.x - p1.currPos.x,
			p2.currPos.y - p1.currPos.y
		);
		let d2 = Math.hypot(
			p3.currPos.x - p2.currPos.x,
			p3.currPos.y - p2.currPos.y
		);
		let d3 = Math.hypot(
			p1.currPos.x - p3.currPos.x,
			p1.currPos.y - p3.currPos.y
		);

		// Access the tear threshold from the simulation's constraint
		let breakThreshold = Constraint.tearThreshold; // Assuming it's accessible like this

		// Skip rendering if any distance suggests the constraint would be broken
		if (d1 > breakThreshold || d2 > breakThreshold || d3 > breakThreshold) {
			return; // This triangle is effectively "torn", so we don't draw it
		}
		// Calculate the cross product of edges (p2-p1) and (p3-p1)
		let crossProduct =
			(p2.currPos.x - p1.currPos.x) * (p3.currPos.y - p1.currPos.y) -
			(p2.currPos.y - p1.currPos.y) * (p3.currPos.x - p1.currPos.x);

		// Determine if the triangle is "facing up" or "facing down"
		let facingUp = crossProduct > 0;

		// Choose color based on the facing direction of the triangle
		let color;
		if (facingUp) {
			// Front side color
			//color = "hsl(210, 70%, 65%)"; // Lighter blue
			color = this.clothColor;
		} else {
			// Back side color
			//color = "hsl(210, 70%, 60%)"; // Darker blue
			color = this.clothColor2;
		}

		// Your existing drawing logic here
		this.ctx.beginPath();
		this.ctx.moveTo(p1.currPos.x, p1.currPos.y);
		this.ctx.lineTo(p2.currPos.x, p2.currPos.y);
		this.ctx.lineTo(p3.currPos.x, p3.currPos.y);
		this.ctx.closePath();
		this.ctx.fillStyle = color;

		this.ctx.fill();
	}

	render() {
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

		// Render constraints
		this.simulation.constraints.forEach((c) => {
			if (c.isBroken) return;
			this.ctx.beginPath();
			this.ctx.moveTo(c.p1.currPos.x, c.p1.currPos.y);
			this.ctx.lineTo(c.p2.currPos.x, c.p2.currPos.y);
			// Change color based on distance
			let dx = c.p2.currPos.x - c.p1.currPos.x;
			let dy = c.p2.currPos.y - c.p1.currPos.y;
			let dist = Math.sqrt(dx * dx + dy * dy);
			let stress = dist / c.restLength - 1; // Normalized stretch amount above the rest length

			// Function to interpolate between two colors based on a factor (0 to 1)
			function interpolateColor(color1, color2, factor) {
				let result = color1.slice(); // Clone the color1 array
				for (let i = 0; i < 3; i++) {
					result[i] = Math.round(result[i] + factor * (color2[i] - color1[i]));
				}
				return `rgb(${result.join(",")})`;
			}
			// Set the initial thickness and maximum stretch effect on thickness
			let baseThickness = 2; // Starting thickness when not stretched
			let maxStretchEffect = 0.5; // This value can be adjusted for more/less sensitivity

			// Calculate the thickness based on stretch (thinner as it stretches more)
			let thickness = Math.max(
				1,
				baseThickness * (1 - Math.min(1, (stress - 1) * maxStretchEffect))
			);
			this.ctx.lineWidth = thickness;

			let baseColor = [0, 0, 0]; // Black
			let stretchColor = [255, 0, 0]; // Red
			this.ctx.strokeStyle = interpolateColor(
				baseColor,
				stretchColor,
				Math.min(1, stress)
			);
			this.ctx.stroke();
		});

		// Render particles
		this.simulation.particles.forEach((p) => {
			this.ctx.beginPath();
			const radius = p.pinned ? 4 : 2;
			this.ctx.arc(p.currPos.x, p.currPos.y, radius, 0, Math.PI * 2);
			this.ctx.fillStyle = p.pinned ? "red" : "black";

			this.ctx.fill();
		});

		//render mesh
		if (this.showFilledMesh) {
			// Only try to draw the mesh if we have a grid structure

			for (let y = 0; y < this.simulation.height - 1; y++) {
				for (let x = 0; x < this.simulation.width - 1; x++) {
					const p1 = this.simulation.particles[y * this.simulation.width + x];
					const p2 =
						this.simulation.particles[y * this.simulation.width + (x + 1)];
					const p3 =
						this.simulation.particles[(y + 1) * this.simulation.width + x];
					const p4 =
						this.simulation.particles[
							(y + 1) * this.simulation.width + (x + 1)
						];

					// Draw triangles

					this.drawFilledTriangle(p1, p2, p3);
					this.drawFilledTriangle(p2, p3, p4);
				}
			}
		}
	}

	// Additional methods for rendering and interaction
}

// Initialize and start the game loop
document.addEventListener("DOMContentLoaded", (event) => {
	const game = new ClothGame();
	game.restartSimulation(true);
	game.loop();
});
