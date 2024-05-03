
document.addEventListener('DOMContentLoaded', function() {
    var canvas = document.getElementById("lineCanvas");
    var canvasContainer = document.getElementById("canvasContainer");
    var maxCanvasContainerHeight = 1000;
    var ctx = canvas.getContext("2d");
    canvas.width =800;
    canvas.height = 600;

    
    // Setup for words and their dots
    ctx.font = '550 14px Roboto';
    ctx.fillStyle = 'black';
    const dotRadius = 5;
    
    var checkButton = document.getElementById("checkPairs"); // Check button element
    
    var dragging = false;
    var selectedDotStart = null;
    var selectedDotEnd = null;
    var movingStart = false; 
    var movingLeft = false; // new
    var selectedLine = null; // Track the selected line
    
    var lines = []; // Array to store lines
    var dots = []; // Array to store dots
    
    var correctPairs = []; // Object to store correct pairs
    var playerAnswers = [];
    
    // URL to the JSON file (can be a relative or absolute path)
    const url = 'data.json';
    
    
    // const margin = canvas.width * 0.05; // Margin from the side of the canvas
    const margin = 15   ; // Margin from the side of the canvas
    
    
    function shuffleIndices(n) {
        let indices = [...Array(n).keys()]; // Create an array of indices [0, 1, 2, ..., n-1]
        for (let i = indices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [indices[i], indices[j]] = [indices[j], indices[i]];
        }
        return indices;
    }
    
    function drawText(text, x, y, align) {
        ctx.textAlign = align;
        ctx.fillText(text, x, y + 3);
    }
    


    function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
        var words = text.split(' ');
        var wordLines = [];
        var currentLine = words[0];

        for (var i = 1; i < words.length; i++) {
            var word = words[i];
            var width = ctx.measureText(currentLine + " " + word).width;
            if (width < maxWidth) {
                currentLine += " " + word;
            } else {
                wordLines.push({ text: currentLine, x, y });
                currentLine = word;
                y += lineHeight;
            }
        }
        wordLines.push({ text: currentLine, x, y }); // Push the last line
        return wordLines;
    }

    fetch('data.json')
    .then(response => response.json())
    .then(data => {
        const maxWidth = canvas.width * 0.4; // Max width for text wrapping
        const lineHeight = 15; // Line height for wrapped text
        let y = 50;


        const fruits = data.fruits;
        const numItems = fruits.length;

        const leftIndices = shuffleIndices(numItems);
        const rightIndices = shuffleIndices(numItems);

        let lastY = 0;

        for (let i = 0; i < numItems; i++) {
            correctPairs.push({left:i, right:i});

            let leftFruit = fruits[leftIndices[i]];
            let rightFruit = fruits[rightIndices[i]];
            
            const leftTextLines = wrapText(ctx, leftFruit.left, canvas.width * 0.45 - margin, y, maxWidth, lineHeight);
            const rightTextLines = wrapText(ctx, rightFruit.right, canvas.width * 0.55 + margin, y, maxWidth, lineHeight);

            
            
            dots.push({
                x: canvas.width * 0.45,
                y,
                word: leftFruit.left,
                side: 'left',
                lines: leftTextLines,
                index: leftIndices[i],
            });
            
            dots.push({
                x: canvas.width * 0.55,
                y,
                word: rightFruit.right,
                side: 'right',
                lines: rightTextLines,
                index: rightIndices[i]
            });
            
            y += Math.max(leftTextLines.length, rightTextLines.length) * lineHeight + 20;
            lastY = y;
        }
        canvas.height = lastY;
        canvasContainer.style.height = lastY + 5 + "px";
        ctx.font = " bold 16px Arial";
        redrawAllLinesAndDots();
    });

    function redrawAllLinesAndDots() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        dots.forEach(dot => {
            ctx.beginPath();
            ctx.arc(dot.x, dot.y, dotRadius, 0, 2 * Math.PI);
            ctx.fill();
            dot.lines.forEach(line => {
                ctx.textAlign = dot.side === 'left' ? 'right' : 'left';
                ctx.fillText(line.text, line.x, line.y);
            });
        });

        lines.forEach(line => {
            ctx.beginPath();
            ctx.moveTo(line.leftDot.x, line.leftDot.y);
            ctx.lineTo(line.rightDot.x, line.rightDot.y);
            ctx.stroke();
        });
    }


    canvas.addEventListener('contextmenu', function(event) {
        event.preventDefault(); // Prevents the default context menu from opening
    });

    function addLine(leftDot, rightDot) {
        lines.push({
            leftDot: leftDot, // Store reference to the start dot object
            rightDot: rightDot,     // Store reference to the end dot object
        });
    }

canvas.addEventListener('mousedown', function(event) {
    if (event.button === 1) return; // Ignore middle-clicks

    var x = event.clientX - canvas.getBoundingClientRect().left;
    var y = event.clientY - canvas.getBoundingClientRect().top;

    if (event.button === 2) { // Right click
        var clickedLine = lines.find(line => isPointNearLine(x, y, line));
        if (clickedLine) {
            lines = lines.filter(line => line !== clickedLine);
            redrawAllLinesAndDots();
        }
        return; // Prevent further processing for right click
    }

    // Attempt to find a line near the click position
    var clickedLine = lines.find(line => isPointNearLine(x, y, line));
    if (clickedLine) {
        // var distanceToStart = distance(x, y, clickedLine.startX, clickedLine.startY);
        // var distanceToEnd = distance(x, y, clickedLine.endX, clickedLine.endY);

        var distanceToLeft = distance(x, y, clickedLine.leftDot.x, clickedLine.rightDot.x);
        var distanceToRight = distance(x, y, clickedLine.rightDot.x, clickedLine.rightDot.x);

        if (distanceToLeft < distanceToRight) {
            // movingStart = true;
            movingLeft = true;
            selectedDotStart = clickedLine.rightDot; // Access the full dot object
        } else {
            movingLeft = false;
            selectedDotStart = clickedLine.leftDot; // Access the full dot object
        }
        selectedDotEnd = null; // Reset end point

        selectedLine = clickedLine; // Store the selected line
        dragging = true; // Start dragging
        return;
    }

    // Check if a dot is clicked
    selectedDotStart = dots.find(dot => isPointNearDot(x, y, dot.x, dot.y, 5));
    if (selectedDotStart) {
        if (dotHasLine(selectedDotStart)) {
            removeDotLine(selectedDotStart); // Remove line if the dot already has one
        }
        dragging = true;
    } else {
        // If no dot is selected, no dragging should occur
        dragging = false;
    }
});

    canvas.addEventListener('mousemove', function(event) {
        var x = event.clientX - canvas.getBoundingClientRect().left;
        var y = event.clientY - canvas.getBoundingClientRect().top;

        const isNearLine = lines.some(line => isPointNearLine(x, y, line));
        const isNearDot = dots.some(dot => isPointNearDot(x, y, dot.x, dot.y, 5));
        canvas.style.cursor = isNearLine || isNearDot ? 'pointer' : 'default';

        if (!dragging || !selectedDotStart) return;

        redrawAllLinesAndDots();

        drawLine(selectedDotStart.x, selectedDotStart.y, x, y, 'rgba(0, 0, 255, 0.5)'); // Preview color
    });

    canvas.addEventListener('mouseup', function(event) {
        if (!dragging) return;
    
        var x = event.clientX - canvas.getBoundingClientRect().left;
        var y = event.clientY - canvas.getBoundingClientRect().top;
    
        selectedDotEnd = dots.find(dot => isPointNearDot(x, y, dot.x, dot.y, 5));
        if (selectedDotEnd && selectedDotStart !== selectedDotEnd) {

            // Check if the start and end dots are on opposite sides
            if ((selectedDotStart.x < canvas.width / 2 && selectedDotEnd.x > canvas.width / 2) ||
                (selectedDotStart.x > canvas.width / 2 && selectedDotEnd.x < canvas.width / 2)) {
                    if (dotHasLine(selectedDotEnd)) {
                        removeDotLine(selectedDotEnd); // Remove existing line if dot already has one
                    }
                    
                    // Only add a line if the dots are on opposite sides
                    if (!selectedLine) {
                        console.log("no selected line");
                        if(selectedDotStart.x < selectedDotEnd.x) {
                            addLine(selectedDotStart, selectedDotEnd);
                            playerAnswers.push({left: selectedDotStart.index, right : selectedDotEnd.index}); // Save the player's answer
                        } else {
                            addLine(selectedDotEnd, selectedDotStart);
                            playerAnswers.push({left: selectedDotEnd.index, right : selectedDotStart.index}); // Save the player's answer
                        }

                    } else {
                        lines = lines.filter(line => line !== selectedLine);
                        
                        playerAnswers = playerAnswers.filter(answer => !(answer.left === selectedLine.leftDot.index && answer.right === selectedLine.rightDot.index));                        console.log("updated playerAnswer");
                        
                        if(selectedDotStart.x < selectedDotEnd.x) {
                            addLine(selectedDotStart, selectedDotEnd);
                            playerAnswers.push({left: selectedDotStart.index, right: selectedDotEnd.index}); // Save the player's answer
                        } else {
                            addLine(selectedDotEnd, selectedDotStart);
                            playerAnswers.push({left: selectedDotEnd.index, right: selectedDotStart.index}); // Save the player's answer
                        }
                        

                    }
                }
            }
            
            // Clear selection and dragging state
            dragging = false;
            selectedDotStart = null;
            selectedDotEnd = null;
            redrawAllLinesAndDots(); // Redraw to update the canvas
            selectedLine = null; // Clear the selected line as it has been repositioned
    });
    
    
    function drawLine(startX, startY, endX, endY, specificColor) {
        specificColor = "black";
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = specificColor || 'black';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    function drawDot(x, y, radius = 5) {
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = 'black';
        ctx.fill();
    }

    function removeDotLine(dot) {
        // First find any lines associated with the dot.
        const associatedLines = lines.filter(line =>
            (line.leftDot.x === dot.x && line.leftDot.y === dot.y) ||
            (line.rightDot.x === dot.x && line.rightDot.y === dot.y)
        );
    
        // Remove the corresponding answers from playerAnswers for each associated line.
        associatedLines.forEach(line => {
            playerAnswers = playerAnswers.filter(answer =>
                !(answer.left === line.leftDot.index && answer.right === line.rightDot.index)
            );
        });
    
        // Finally, remove the lines from the lines array.
        lines = lines.filter(line => !associatedLines.includes(line));
    }
    

    function isPointNearDot(px, py, dotX, dotY, radius) {
        return Math.sqrt(Math.pow(dotX - px, 2) + Math.pow(dotY - py, 2)) <= radius + 5; // Increased radius for easier selection
    }

    function dotHasLine(dot) {
        return lines.some(line => line.leftDot.x === dot.x && line.leftDot.y === dot.y || line.rightDot.x === dot.x && line.rightDot.y === dot.y);
    }

    function distance(px, py, qx, qy) {
        return Math.sqrt(Math.pow(qx - px, 2) + Math.pow(qy - py, 2));
    }

    function isPointNearLine(px, py, line) {
        const tolerance = 5;
        let startX = line.leftDot.x;
        let endX = line.rightDot.x;
        let startY = line.leftDot.y;
        let endY = line.rightDot.y;
        var dx = endX - startX;
        var dy = endY - startY;
        var length = Math.sqrt(dx * dx + dy * dy);
        var percent = ((px - startX) * dx + (py - startY) * dy) / (length * length);
        var nearestX = startX + percent * dx;
        var nearestY = startY + percent * dy;
        var distance = Math.sqrt(Math.pow(px - nearestX, 2) + Math.pow(py - nearestY, 2));

        return distance < tolerance && percent >= 0 && percent <= 1;
    }
    
    // Ensure the button click calls calculateScore
    // document.getElementById("checkPairs").addEventListener("click", calculateScore);
    
    function calculateScore() {
        // Retrieve the element to display score
        var scoreContainer = document.getElementById("score-container");
        scoreContainer.style.display = "block";
        var scoreElement = document.getElementById("score");
        var score = playerAnswers.reduce((acc, answer) => {
            return acc + (answer.left === answer.right ? 1 : 0);
        }, 0);
        
        // Update the score in the HTML
        scoreElement.textContent = score + "/" + correctPairs.length;
    }

    var isSolution = false;
    document.getElementById("solution").addEventListener("click", toggleSolution);

    var solutionBtn = document.getElementById("solution");
    function toggleSolution(){
        calculateScore();
        if(isSolution){
            solutionBtn.innerHTML = "Voir la solution";
            var scoreContainer = document.getElementById("score-container");
            scoreContainer.style.display = "none";
            redrawAllLinesAndDots();
            isSolution = false;
            return;
        }
        solutionBtn.innerHTML = "Cacher la solution";
        


        correctPairs.forEach(pair => {
            const leftDot = dots.find(dot => dot.index === pair.left && dot.side === 'left');
            const rightDot = dots.find(dot => dot.index === pair.right && dot.side === 'right');

            // Draw a line between the matching dots
            ctx.beginPath();
            ctx.moveTo(leftDot.x, leftDot.y);
            ctx.lineTo(rightDot.x, rightDot.y);
            ctx.strokeStyle = 'green'; // Color for solution lines
            ctx.lineWidth = 2;
            ctx.stroke();
        });

        isSolution = true;
    }
});

