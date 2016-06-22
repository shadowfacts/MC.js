var MC  = {
	craftingBackground: new Image(),
	smeltingBackground: new Image(),
	modids: [],
	textureSheets: {},
	uvMapURLs: {},
	uvMaps: {},
	register: register,
	init: init
};

MC.craftingBackground.src = "crafting-recipe.png";
MC.smeltingBackground.src = "smelting-recipe.png"

MC.register("Minecraft", "sheet.png", "sheet-min.json");

function register(modid, textureSheet, uvMap) {
	modid = modid.toLowerCase();
	if (!MC.modids.includes(modid)) MC.modids.push(modid);
	MC.textureSheets[modid] = new Image();
	MC.textureSheets[modid].src = textureSheet;
	MC.uvMapURLs[modid] = uvMap;
}

function init() {
	var requests = [];
	for (var i in MC.uvMapURLs) {
		if (i) {
			requests.push($.get(MC.uvMapURLs[i]));
		}
	}
	if (requests.length == 1) {
		requests[0].done(function(data) {
			MC.uvMaps[MC.modids[0]] = data;

			addCanvases();
			setItems();
		});
	} else {
		$.when.apply($, requests).done(function() {
			$.each(arguments, function(i, data) {
				MC.uvMaps[MC.modids[i]] = data[0];
			});

			addCanvases();
			setItems();
		});
	}

}

function addCanvases() {
	var crafting = {
		contexts: [],
		inputs: [],
		outputs: []
	};

	var smelting = {
		contexts: [],
		inputs: [],
		outputs: []
	};

	var canvases = document.getElementsByClassName("recipe");
	for (var i = 0; i < canvases.length; i++) {
		var canvas = canvases[i];

		if (canvas.classList.contains("crafting")) {
			addCrafting(crafting, canvas);
		} else if (canvas.classList.contains("smelting")) {
			addSmelting(smelting, canvas);
		}

	}

	window.requestAnimationFrame(function() {
		drawAll(crafting, smelting);
	});
}

function setItems() {
	var items = document.getElementsByClassName("mcitem");
	for (var i = 0; i < items.length; i++) {
		var item = items[i];
		var stack = parseStack(item.getAttribute("data-item"));
		var image = getImage(stack);
		var css = "background-image: url(\"" + MC.textureSheets[stack.modid].src + "\"); background-position: " + -image.u + "px " + -image.v + "px;";
		item.setAttribute("style", css);
	}
}

function addCrafting(crafting, canvas) {
	crafting.contexts.push(canvas.getContext("2d"));
	crafting.inputs.push(parseCraftingInput(canvas.getAttribute("data-input")));
	crafting.outputs.push(parseStack(canvas.getAttribute("data-output")));
}

function addSmelting(smelting, canvas) {
	smelting.contexts.push(canvas.getContext("2d"));
	smelting.inputs.push(parseStack(canvas.getAttribute("data-input")));
	smelting.outputs.push(parseStack(canvas.getAttribute("data-output")));
}

function drawAll(crafting, smelting) {
	drawCraftingRecipes(crafting.contexts, crafting.inputs, crafting.outputs);
	drawSmeltingRecipes(smelting.contexts, smelting.inputs, smelting.outputs);

	window.requestAnimationFrame(function() {
		drawAll(crafting, smelting);
	});
}

function drawCraftingRecipes(contexts, inputs, outputs) {

	for (var i = 0; i < contexts.length; i++) {
		var context = contexts[i];
		var input = inputs[i];
		var output = outputs[i];

		context.canvas.width = MC.craftingBackground.width;
		context.canvas.height = MC.craftingBackground.height;

		context.drawImage(MC.craftingBackground, 0, 0);

		for (var x = 0; x < 3; x++) {
			for (var y = 0; y < 3; y++) {
				var stack = input[x][y];
				if (stack != null) {
					drawStack(context, stack, 10 + x * 36, 10 + y * 36);
				}
			}
		}

		drawStack(context, output, 198, 46);
	}
}

function drawSmeltingRecipes(contexts, inputs, outputs) {
	for (var i = 0; i < contexts.length; i++) {
		var context = contexts[i];
		var input = inputs[i];
		var output = outputs[i];

		context.canvas.width = MC.smeltingBackground.width;
		context.canvas.height = MC.smeltingBackground.height;

		context.drawImage(MC.smeltingBackground, 0, 0);

		drawStack(context, input, 6, 12);
		drawStack(context, output, 126, 14);
	}
}

function drawStack(context, stack, x, y) {
	var image = getImage(stack);
	context.drawImage(MC.textureSheets[stack.modid], image.u, image.v, 32, 32, x, y, 32, 32);
	if (stack.amount != 1) {
		context.font = "14px Minecraftia";
		context.textAlign = "right";

		context.fillStyle = "rgba(25, 25, 25, 255)";
		context.fillText(stack.amount, x + 34, y + 41)

		context.fillStyle = "white";
		context.fillText(stack.amount, x + 32, y + 39);
	}
}

function getImage(stack) {
	return {
		u: getU(stack),
		v: getV(stack)
	};
}

function getU(stack) {
	return MC.uvMaps[stack.modid][stack.modid][stack.name][stack.meta][0];
}

function getV(stack) {
	return MC.uvMaps[stack.modid][stack.modid][stack.name][stack.meta][1];
}

function parseStack(str) {
	var stack = {};

	var bits = str.split("*");

	stack.amount = bits.length > 1 ? parseInt(bits[1]) : 1;

	var itemStr = bits[0];
	var otherBits = itemStr.split(":");

	if (otherBits.length == 1) { // name
		stack.modid = "minecraft";
		stack.name = otherBits[0];
		stack.meta = 0;
	} else if (otherBits.length == 2) { // modid:name
		stack.modid = otherBits[0];
		stack.name = otherBits[1];
		stack.meta = 0;
	} else if (otherBits.length == 3) { // modid:name:meta
		stack.modid = otherBits[0];
		stack.name = otherBits[1];
		stack.meta = parseInt(otherBits[2]);
	}

	stack.modid = stack.modid.toLowerCase();

	if (stack.name == "empty") {
		return null;
	}

	return stack;
}

function parseCraftingInput(str) {
	var array = [[], [], []];
	var bits = str.split(",");

	for (var i in bits) {
		array[i % 3][Math.floor(i / 3)] = parseStack(bits[i]);
	}

	return array;
}