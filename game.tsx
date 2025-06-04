"use client"

import type React from "react"

import { useEffect, useRef, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface Player {
  x: number
  y: number
  width: number
  height: number
  health: number
  maxHealth: number
  facing: "left" | "right"
  isJumping: boolean
  isCrouching: boolean
  isAttacking: boolean
  attackType: "punch" | "kick" | null
  velocityY: number
  lastAttackTime: number
  color: string
  name: string
}

interface GameState {
  player1: Player
  player2: Player
  gameStarted: boolean
  winner: string | null
  roomCode: string
}

const CANVAS_WIDTH = 800
const CANVAS_HEIGHT = 400
const GROUND_Y = 320
const GRAVITY = 0.8
const JUMP_FORCE = -15
const MOVE_SPEED = 4
const ATTACK_DURATION = 300
const KICK_COMBO_TIME = 500

export default function Component() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [gameState, setGameState] = useState<GameState>({
    player1: {
      x: 150,
      y: GROUND_Y,
      width: 40,
      height: 60,
      health: 100,
      maxHealth: 100,
      facing: "right",
      isJumping: false,
      isCrouching: false,
      isAttacking: false,
      attackType: null,
      velocityY: 0,
      lastAttackTime: 0,
      color: "#ff4444",
      name: "Player 1",
    },
    player2: {
      x: 600,
      y: GROUND_Y,
      width: 40,
      height: 60,
      health: 100,
      maxHealth: 100,
      facing: "left",
      isJumping: false,
      isCrouching: false,
      isAttacking: false,
      attackType: null,
      velocityY: 0,
      lastAttackTime: 0,
      color: "#4444ff",
      name: "Player 2",
    },
    gameStarted: false,
    winner: null,
    roomCode: "",
  })

  const [roomInput, setRoomInput] = useState("")
  const [showLobby, setShowLobby] = useState(true)
  const keysPressed = useRef<Set<string>>(new Set())

  const generateRoomCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase()
  }

  const startGame = (roomCode?: string) => {
    const code = roomCode || generateRoomCode()
    setGameState((prev) => ({
      ...prev,
      gameStarted: true,
      roomCode: code,
      winner: null,
      player1: { ...prev.player1, health: 100 },
      player2: { ...prev.player2, health: 100 },
    }))
    setShowLobby(false)
  }

  const checkCollision = (attacker: Player, defender: Player): boolean => {
    const attackRange = attacker.facing === "right" ? 50 : -50
    const attackX = attacker.x + (attacker.facing === "right" ? attacker.width : 0) + attackRange

    return (
      Math.abs(attackX - (defender.x + defender.width / 2)) < 60 &&
      Math.abs(attacker.y - defender.y) < 80 &&
      !defender.isCrouching
    )
  }

  const handleAttack = (player: Player, opponent: Player, attackType: "punch" | "kick"): Player[] => {
    if (player.isAttacking) return [player, opponent]

    const now = Date.now()
    const newPlayer = {
      ...player,
      isAttacking: true,
      attackType,
      lastAttackTime: now,
    }

    const newOpponent = { ...opponent }

    if (checkCollision(newPlayer, opponent)) {
      const damage = attackType === "punch" ? 15 : 25
      newOpponent.health = Math.max(0, opponent.health - damage)
    }

    return [newPlayer, newOpponent]
  }

  const updateGame = useCallback(() => {
    if (!gameState.gameStarted || gameState.winner) return

    setGameState((prev) => {
      const newPlayer1 = { ...prev.player1 }
      const newPlayer2 = { ...prev.player2 }

      // Handle Player 1 input (WASD + Space)
      if (keysPressed.current.has("a") || keysPressed.current.has("A")) {
        newPlayer1.x = Math.max(0, newPlayer1.x - MOVE_SPEED)
        newPlayer1.facing = "left"
      }
      if (keysPressed.current.has("d") || keysPressed.current.has("D")) {
        newPlayer1.x = Math.min(CANVAS_WIDTH - newPlayer1.width, newPlayer1.x + MOVE_SPEED)
        newPlayer1.facing = "right"
      }
      if (keysPressed.current.has("w") || keysPressed.current.has("W")) {
        if (!newPlayer1.isJumping) {
          newPlayer1.velocityY = JUMP_FORCE
          newPlayer1.isJumping = true
        }
      }
      if (keysPressed.current.has("s") || keysPressed.current.has("S")) {
        newPlayer1.isCrouching = true
      } else {
        newPlayer1.isCrouching = false
      }

      // Handle Player 2 input (Arrow keys + Enter)
      if (keysPressed.current.has("ArrowLeft")) {
        newPlayer2.x = Math.max(0, newPlayer2.x - MOVE_SPEED)
        newPlayer2.facing = "left"
      }
      if (keysPressed.current.has("ArrowRight")) {
        newPlayer2.x = Math.min(CANVAS_WIDTH - newPlayer2.width, newPlayer2.x + MOVE_SPEED)
        newPlayer2.facing = "right"
      }
      if (keysPressed.current.has("ArrowUp")) {
        if (!newPlayer2.isJumping) {
          newPlayer2.velocityY = JUMP_FORCE
          newPlayer2.isJumping = true
        }
      }
      if (keysPressed.current.has("ArrowDown")) {
        newPlayer2.isCrouching = true
      } else {
        newPlayer2.isCrouching = false
      }
      // Apply gravity and jumping
      ;[newPlayer1, newPlayer2].forEach((player) => {
        if (player.isJumping) {
          player.y += player.velocityY
          player.velocityY += GRAVITY

          if (player.y >= GROUND_Y) {
            player.y = GROUND_Y
            player.isJumping = false
            player.velocityY = 0
          }
        }
      })

      // Reset attack states
      const now = Date.now()
      if (newPlayer1.isAttacking && now - newPlayer1.lastAttackTime > ATTACK_DURATION) {
        newPlayer1.isAttacking = false
        newPlayer1.attackType = null
      }
      if (newPlayer2.isAttacking && now - newPlayer2.lastAttackTime > ATTACK_DURATION) {
        newPlayer2.isAttacking = false
        newPlayer2.attackType = null
      }

      // Check for winner
      let winner = null
      if (newPlayer1.health <= 0) winner = newPlayer2.name
      if (newPlayer2.health <= 0) winner = newPlayer1.name

      return {
        ...prev,
        player1: newPlayer1,
        player2: newPlayer2,
        winner,
      }
    })
  }, [gameState.gameStarted, gameState.winner])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    keysPressed.current.add(e.key)

    // Handle attacks
    if (e.key === " " || e.key === "Spacebar") {
      e.preventDefault()
      const now = Date.now()
      setGameState((prev) => {
        const timeSinceLastAttack = now - prev.player1.lastAttackTime
        const isKick = timeSinceLastAttack < KICK_COMBO_TIME && prev.player1.lastAttackTime > 0
        const [newPlayer1, newPlayer2] = handleAttack(prev.player1, prev.player2, isKick ? "kick" : "punch")
        return { ...prev, player1: newPlayer1, player2: newPlayer2 }
      })
    }

    if (e.key === "Enter") {
      const now = Date.now()
      setGameState((prev) => {
        const timeSinceLastAttack = now - prev.player2.lastAttackTime
        const isKick = timeSinceLastAttack < KICK_COMBO_TIME && prev.player2.lastAttackTime > 0
        const [newPlayer2, newPlayer1] = handleAttack(prev.player2, prev.player1, isKick ? "kick" : "punch")
        return { ...prev, player1: newPlayer1, player2: newPlayer2 }
      })
    }
  }, [])

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    keysPressed.current.delete(e.key)
  }, [])

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const x = e.clientX - rect.left
    const now = Date.now()

    setGameState((prev) => {
      // Determine which player clicked based on mouse position
      const isPlayer1Side = x < CANVAS_WIDTH / 2

      if (isPlayer1Side) {
        const timeSinceLastAttack = now - prev.player1.lastAttackTime
        const isKick = timeSinceLastAttack < KICK_COMBO_TIME && prev.player1.lastAttackTime > 0
        const [newPlayer1, newPlayer2] = handleAttack(prev.player1, prev.player2, isKick ? "kick" : "punch")
        return { ...prev, player1: newPlayer1, player2: newPlayer2 }
      } else {
        const timeSinceLastAttack = now - prev.player2.lastAttackTime
        const isKick = timeSinceLastAttack < KICK_COMBO_TIME && prev.player2.lastAttackTime > 0
        const [newPlayer2, newPlayer1] = handleAttack(prev.player2, prev.player1, isKick ? "kick" : "punch")
        return { ...prev, player1: newPlayer1, player2: newPlayer2 }
      }
    })
  }

  const drawPlayer = (ctx: CanvasRenderingContext2D, player: Player) => {
    const { x, y, width, height, color, isCrouching, isAttacking, attackType, facing } = player

    // Draw player body
    ctx.fillStyle = color
    const playerHeight = isCrouching ? height * 0.7 : height
    const playerY = isCrouching ? y + (height - playerHeight) : y

    ctx.fillRect(x, playerY, width, playerHeight)

    // Draw face direction indicator
    ctx.fillStyle = "#ffffff"
    const eyeX = facing === "right" ? x + width - 8 : x + 4
    ctx.fillRect(eyeX, playerY + 8, 4, 4)

    // Draw attack indicator
    if (isAttacking) {
      ctx.fillStyle = attackType === "kick" ? "#ffff00" : "#ff8800"
      const attackX = facing === "right" ? x + width : x - 20
      ctx.fillRect(attackX, playerY + 10, 20, 8)
    }
  }

  const drawHealthBar = (ctx: CanvasRenderingContext2D, player: Player, x: number, y: number) => {
    const barWidth = 200
    const barHeight = 20

    // Background
    ctx.fillStyle = "#333333"
    ctx.fillRect(x, y, barWidth, barHeight)

    // Health
    ctx.fillStyle = player.health > 30 ? "#44ff44" : "#ff4444"
    const healthWidth = (player.health / player.maxHealth) * barWidth
    ctx.fillRect(x, y, healthWidth, barHeight)

    // Border
    ctx.strokeStyle = "#ffffff"
    ctx.lineWidth = 2
    ctx.strokeRect(x, y, barWidth, barHeight)

    // Text
    ctx.fillStyle = "#ffffff"
    ctx.font = "14px monospace"
    ctx.fillText(`${player.name}: ${player.health}/100`, x, y - 5)
  }

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Clear canvas
    ctx.fillStyle = "#87CEEB"
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    // Draw ground
    ctx.fillStyle = "#8B4513"
    ctx.fillRect(0, GROUND_Y + 60, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y - 60)

    if (gameState.gameStarted) {
      // Draw players
      drawPlayer(ctx, gameState.player1)
      drawPlayer(ctx, gameState.player2)

      // Draw health bars
      drawHealthBar(ctx, gameState.player1, 50, 30)
      drawHealthBar(ctx, gameState.player2, CANVAS_WIDTH - 250, 30)

      // Draw winner message
      if (gameState.winner) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.8)"
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

        ctx.fillStyle = "#ffffff"
        ctx.font = "48px monospace"
        ctx.textAlign = "center"
        ctx.fillText(`${gameState.winner} Wins!`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2)

        ctx.font = "24px monospace"
        ctx.fillText("Press R to restart", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 60)
      }

      // Draw controls
      ctx.fillStyle = "#ffffff"
      ctx.font = "12px monospace"
      ctx.textAlign = "left"
      ctx.fillText("P1: WASD + Space (punch/kick)", 10, CANVAS_HEIGHT - 40)
      ctx.fillText("P2: Arrows + Enter (punch/kick)", 10, CANVAS_HEIGHT - 25)
      ctx.fillText("Double tap attack for kick", 10, CANVAS_HEIGHT - 10)
    }
  }, [gameState])

  useEffect(() => {
    const gameLoop = setInterval(() => {
      updateGame()
      draw()
    }, 1000 / 60)

    return () => clearInterval(gameLoop)
  }, [updateGame, draw])

  useEffect(() => {
    const handleKeyDownEvent = (e: KeyboardEvent) => {
      if (e.key === "r" || e.key === "R") {
        if (gameState.winner) {
          startGame(gameState.roomCode)
        }
      } else {
        handleKeyDown(e)
      }
    }

    window.addEventListener("keydown", handleKeyDownEvent)
    window.addEventListener("keyup", handleKeyUp)

    return () => {
      window.removeEventListener("keydown", handleKeyDownEvent)
      window.removeEventListener("keyup", handleKeyUp)
    }
  }, [handleKeyDown, handleKeyUp, gameState.winner, gameState.roomCode])

  if (showLobby) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="text-center">Pixel Fighter</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={() => startGame()} className="w-full">
              Create Room
            </Button>

            <div className="text-center text-sm text-gray-500">or</div>

            <div className="space-y-2">
              <Input
                placeholder="Enter room code"
                value={roomInput}
                onChange={(e) => setRoomInput(e.target.value.toUpperCase())}
                maxLength={6}
              />
              <Button onClick={() => startGame(roomInput)} className="w-full" disabled={roomInput.length !== 6}>
                Join Room
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 p-4">
      <div className="mb-4 text-white text-center">
        <h1 className="text-2xl font-bold mb-2">Pixel Fighter</h1>
        <p className="text-sm">
          Room Code: <span className="font-mono bg-gray-700 px-2 py-1 rounded">{gameState.roomCode}</span>
        </p>
      </div>

      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="border-2 border-gray-600 bg-sky-200 cursor-crosshair"
        onClick={handleCanvasClick}
      />

      <div className="mt-4 text-center">
        <Button onClick={() => setShowLobby(true)} variant="outline" className="mr-2">
          Back to Lobby
        </Button>
        {gameState.winner && <Button onClick={() => startGame(gameState.roomCode)}>Restart Game</Button>}
      </div>
    </div>
  )
}
