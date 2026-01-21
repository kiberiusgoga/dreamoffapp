# Како да ги зачуваш промените на GitHub (Git Guide 101)

Бидејќи репозиториумот е веќе поврзан, процесот е едноставен и се состои од 3 главни чекори. Замисли го како испраќање пакет по пошта.

## 1. Stage (Пакување)
Прво мораме да ги собереме сите нови фајлови и промени во кутијата.
```powershell
git add .
```
*Точката значи "сè". Ова ги собира сите промени.*

## 2. Commit (Залепување етикета)
Сега ја затвораме кутијата и ставаме етикета што има внатре (порака).
```powershell
git commit -m "Tvoja poraka tuka"
```
*На пример: `git commit -m "Nov dizajn na kopcinja"`*

## 3. Push (Isprakjanje)
Конечно, го праќаме пакетот на главниот сервер (GitHub).
```powershell
git push origin main
```
*Ова ги качува фајловите онлајн.*

---

## Пробај сега:
Можеш да ги ископираш и извршиш овие 3 команди една по една во терминалот долу:

```powershell
git add .
git commit -m "UI improvements and separating record/write screens"
git push origin main
```
