module Index exposing (main)

import Browser
import Html exposing (Html)
import Html.Events
import Html.Attributes
import Json.Decode
import Regex
import Time
import Time.Extra

import Bem

main =
  Browser.element { init = init, update = update, view = view, subscriptions = subscriptions }

-- MODEL

type alias FilledIndexItem =
  { path: String
  , thumbnail: String
  , original: IndexItem
  }

type alias IndexItem =
  { label: String
  , title: String
  , times:
    { atime: Int
    , mtime: Int
    , ctime: Int
    }
  }

getTimeFromIndexItem : IndexItem -> Int
getTimeFromIndexItem item =
  item |> .times |> .mtime

type alias IndexMeta =
  { view_path: String
  , thumbnail_path: String
  , item_view_limit: Int
  , item_view_index: Int
  }

createIndexMeta : String -> String -> Maybe Int -> IndexMeta
createIndexMeta view_path thumbnail_path item_view_limit =
  { view_path = view_path
  , thumbnail_path = thumbnail_path
  , item_view_limit =
    case item_view_limit of
      Just x -> x
      _ -> 12
  , item_view_index = 0
  }

type alias IndexInfo =
  { meta: IndexMeta
  , slides: List IndexItem
  , filter: IndexFilter
  , order: IndexOrder
  }

type IndexOrder
  = DescendTime
  | AscendTime
  | DescendTitle
  | AscendTitle
  | DescendLabel
  | AscendLabel

indexOrders =
  [ { value = "Time ↓", orderType = DescendTime }
  , { value = "Time ↑", orderType = AscendTime }
  , { value = "Title ↓", orderType = DescendTitle }
  , { value = "Title ↑", orderType = AscendTitle }
  , { value = "Label ↓", orderType = DescendLabel }
  , { value = "Label ↑", orderType = AscendLabel }
  ]

mapOrder : String -> Maybe IndexOrder
mapOrder str =
  List.foldl
    (\cur -> \acc -> case acc of
      Just _ -> acc
      Nothing ->
        if cur.value == str then
          Just cur.orderType
        else
          Nothing
    )
    Nothing indexOrders

createIndexInfo : IndexMeta -> (List IndexItem) -> IndexInfo
createIndexInfo meta slides =
  { meta = meta
  , slides = slides
  , filter = Nothing
  , order = DescendTime
  }

type Model
  = ParseOk IndexInfo
  | ParseError

fillIndexItem : IndexMeta -> IndexItem -> FilledIndexItem
fillIndexItem meta item =
  { path = (meta.view_path ++ "?label=" ++ item.label)
  , thumbnail = (meta.thumbnail_path ++ "?label=" ++ item.label)
  , original = item
  }

indexItemDecoder =
  Json.Decode.map3 IndexItem
    (Json.Decode.field "label" Json.Decode.string)
    (Json.Decode.field "title" Json.Decode.string)
    (Json.Decode.field "times"
      (Json.Decode.map3 (\x1 -> \x2 -> \x3 -> { atime = x1, mtime = x2, ctime = x3 })
        (Json.Decode.field "atime" Json.Decode.int)
        (Json.Decode.field "mtime" Json.Decode.int)
        (Json.Decode.field "ctime" Json.Decode.int)
      )
    )

indexInfoDecoder : Json.Decode.Decoder IndexInfo
indexInfoDecoder =
  Json.Decode.map2 createIndexInfo
    (Json.Decode.field "meta"
      (Json.Decode.map3 createIndexMeta
        (Json.Decode.field "view_path" Json.Decode.string)
        (Json.Decode.field "thumbnail_path" Json.Decode.string)
        (Json.Decode.maybe (Json.Decode.field "item_view_limit" Json.Decode.int))
    ))
    (Json.Decode.field "slides" (Json.Decode.list indexItemDecoder))

init : String -> ( Model, Cmd Msg )
init flags =
  case (Json.Decode.decodeString indexInfoDecoder flags) of
    Ok a ->
      ( ParseOk a, Cmd.none )
    Err _ ->
      ( ParseError, Cmd.none )

-- UPDATE

type Msg =
   IncrementPagerIndex
   | DecrementPagerIndex
   | UpdateFilter String
   | UpdateOrder String

update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
  case model of
    ParseOk info ->
      case msg of
        IncrementPagerIndex -> ( ParseOk (updateOffsetInInfo info (incrementAmount info)), Cmd.none )
        DecrementPagerIndex -> ( ParseOk (updateOffsetInInfo info (decrementAmount info)), Cmd.none )
        UpdateFilter a ->
          let updatedInfo = updateFilter info a
          in ( ParseOk (updateOffsetInInfo updatedInfo (adjustAmount updatedInfo)), Cmd.none )
        UpdateOrder a ->
          case (mapOrder a) of
            Just updatedOrder -> ( ParseOk {info | order = updatedOrder}, Cmd.none )
            Nothing -> ( ParseOk info, Cmd.none )
    ParseError -> (model, Cmd.none)

incrementAmount : IndexInfo -> Int
incrementAmount info =
  info.meta.item_view_limit

decrementAmount : IndexInfo -> Int
decrementAmount info =
  negate info.meta.item_view_limit

adjustAmount : IndexInfo -> Int
adjustAmount info =
  let numOfSlides = List.length (filterSlides info.filter info.slides)
      tick = info.meta.item_view_limit
  in
    if numOfSlides < info.meta.item_view_index then
      ((numOfSlides - 1) // tick - info.meta.item_view_index // tick) * tick
    else
      0

updateOffsetInInfo : IndexInfo -> Int -> IndexInfo
updateOffsetInInfo info amount =
  let
    meta = info.meta
    limit =  List.length (filterSlides info.filter info.slides)
    next =  info.meta.item_view_index + amount
  in
    if (next < 0) || (limit <= next) then
      info
    else
      {info | meta = {meta | item_view_index = next}}

updateFilter : IndexInfo -> String -> IndexInfo
updateFilter info filter =
  let updatedFilter = parseFilter filter
  in { info | filter = updatedFilter }

filterSlides : IndexFilter -> (List IndexItem) -> (List IndexItem)
filterSlides updatedFilter slides =
  List.filter (applyFilter updatedFilter) slides

sortSlides : IndexOrder -> (List IndexItem) -> (List IndexItem)
sortSlides order slides =
  case order of
    AscendTime -> List.sortBy getTimeFromIndexItem slides
    DescendTime -> List.sortWith (flippedComparisonBy getTimeFromIndexItem) slides
    AscendTitle -> List.sortBy .title slides
    DescendTitle -> List.sortWith (flippedComparisonBy .title) slides
    AscendLabel -> List.sortBy .label slides
    DescendLabel -> List.sortWith (flippedComparisonBy .label) slides

flippedComparisonBy : (a -> comparable) -> a -> a -> Order
flippedComparisonBy by a b =
  case compare (by a) (by b) of
    LT -> GT
    EQ -> EQ
    GT -> LT

takeSlides : IndexInfo -> (List IndexItem) -> (List IndexItem)
takeSlides info slides =
  slides
    |> List.drop info.meta.item_view_index
    |> List.take info.meta.item_view_limit

applyFilter : IndexFilter -> IndexItem -> Bool
applyFilter maybeFilter item =
  case maybeFilter of
    Nothing -> True
    Just filter ->
      applyStringListFilter item .label filter.label
      && applyStringListFilter item .title filter.title
      && applyTimeFilter item getTimeFromIndexItem (<) filter.until
      && applyTimeFilter item getTimeFromIndexItem (>) filter.since

applyStringListFilter : IndexItem -> (IndexItem -> String) -> List String -> Bool
applyStringListFilter item extractor searches =
  List.foldl (\cur -> \acc -> acc && String.contains cur (extractor item)) True searches

applyTimeFilter : IndexItem -> (IndexItem -> Int) -> (Int -> Int -> Bool) -> Maybe Int -> Bool
applyTimeFilter item extractor cmp value =
  case value of
    Nothing -> True
    Just a -> cmp (extractor item) a

type alias IndexFilter =
  Maybe { since: Maybe Int
  , until: Maybe Int
  , title: List String
  , label: List String
  }

datePattern : String
datePattern = "[0-9]{4}-[0-9]{1,2}-[0-9]{1,2}"

spaceChars : String
spaceChars = "\t\r\n "

sincePattern : String
sincePattern = "since:[" ++ spaceChars ++ "]*(" ++ datePattern ++ ")"

untilPattern : String
untilPattern = "until:[" ++ spaceChars ++ "]*(" ++ datePattern ++ ")"

titlePattern : String
titlePattern = "title:([^" ++ spaceChars ++ "]+)"

metaPattern : List String
metaPattern = [ sincePattern, untilPattern, titlePattern ]

parseMeta: String -> String -> List String
parseMeta pattern target =
  case (Regex.fromString pattern) of
    Just regex ->
      if List.member pattern metaPattern then
        List.map .submatches (Regex.find regex target)
          |> List.concat
          |> List.filterMap identity
      else
        []
    Nothing -> []

createDateParts : List Int -> Maybe Time.Extra.Parts
createDateParts xs =
  case checkListCount 3 (<=) xs of
    Nothing -> Nothing
    _ ->
      let
        maybe_year  = List.head xs
        maybe_month = List.tail xs |> Maybe.andThen List.head |> Maybe.andThen toMonthFromInt
        maybe_day   = List.tail xs |> Maybe.andThen List.tail |> Maybe.andThen List.head
      in
        case (maybe_year, maybe_month, maybe_day) of
          (Nothing, _, _) -> Nothing
          (_, Nothing, _) -> Nothing
          (_, _, Nothing) -> Nothing
          (Just year, Just month, Just day) ->
            Just (Time.Extra.Parts year month day 0 0 0 0)

parseDateString: String -> Maybe Time.Posix
parseDateString str =
  String.split "-" str
    |> checkListCount 3 (<=)
    |> Maybe.map (List.filterMap String.toInt)
    |> Maybe.andThen createDateParts
    |> Maybe.map (Time.Extra.partsToPosix Time.utc)

parseDate: String -> String -> List Int
parseDate pattern str =
  parseMeta pattern str |> List.filterMap parseDateString |> List.map Time.posixToMillis

toMonthFromInt : Int -> Maybe Time.Month
toMonthFromInt num =
  case num of
    1  -> Just Time.Jan
    2  -> Just Time.Feb
    3  -> Just Time.Mar
    4  -> Just Time.Apr
    5  -> Just Time.May
    6  -> Just Time.Jun
    7  -> Just Time.Jul
    8  -> Just Time.Aug
    9  -> Just Time.Sep
    10 -> Just Time.Oct
    11 -> Just Time.Nov
    12 -> Just Time.Dec
    _ -> Nothing

checkListCount : Int -> (Int -> Int -> Bool) -> List a -> Maybe (List a)
checkListCount num cmp lst =
  if cmp num (List.length lst) then Just lst
  else Nothing

labelPattern : String
labelPattern = String.join "|" metaPattern

parseLabel : String -> List String
parseLabel target =
  case (Regex.fromString labelPattern) of
    Just regex -> Regex.split regex target
      |> String.join " "
      |> String.split " "
      |> List.filter ((/=) "")
    Nothing -> []

parseFilter : String -> IndexFilter
parseFilter str =
  Just
  { since = parseDate sincePattern str |> List.maximum
  , until = parseDate untilPattern str |> List.minimum
  , title = parseMeta titlePattern str
  , label = parseLabel str
  }

-- VIEW

view : Model -> Html Msg
view model =
  case model of
    ParseOk info ->
      let displaySlides = filterSlides info.filter info.slides |> sortSlides info.order
      in
        Html.div (Bem.createB "index")
          [ renderIndexNavigator info.meta.item_view_index (List.length displaySlides) info.meta.item_view_limit
          , renderIndexList info.meta (List.map (fillIndexItem info.meta) (takeSlides info displaySlides))
          ]
    ParseError ->
      Html.div [] [ Html.text "json parse error" ]

renderIndexNavigator : Int -> Int -> Int -> Html Msg
renderIndexNavigator index max limit =
  Html.div ( Bem.createBE "index" "navigator" )
    [ renderIndexSorter
    , renderIndexPager index max
    , renderIndexFilter
    ]

onChange : (String -> msg) -> Html.Attribute msg
onChange handler =
    Html.Events.on "change" (Json.Decode.map handler Html.Events.targetValue)

renderIndexSorter : Html Msg
renderIndexSorter =
  Html.div ( List.append ( Bem.createBE "index" "navigator-element" ) ( Bem.createBE "index" "sorter" ) )
    [ Html.select (List.append [ onChange (\a -> UpdateOrder a) ] (Bem.createBE "index" "sorter-menu"))
      ( List.map .value indexOrders
        |> List.map (\order -> Html.option [ Html.Attributes.value order ] [ Html.text order ])
      )
    ]

renderIndexPager : Int -> Int -> Html Msg
renderIndexPager index max =
  Html.div ( List.append ( Bem.createBE "index" "navigator-element" ) ( Bem.createBE "index" "pager" ) )
    [ Html.button (List.append [ Html.Events.onClick DecrementPagerIndex ] (Bem.createBEM "index" "pager-button" "prev")) [ Html.text "<" ]
    , Html.div (Bem.createBE "index" "pager-index") [ Html.text ((String.fromInt index) ++ "/" ++ (String.fromInt max))]
    , Html.button (List.append [ Html.Events.onClick IncrementPagerIndex ] (Bem.createBEM "index" "pager-button" "next")) [ Html.text ">" ]
    ]

renderIndexFilter : Html Msg
renderIndexFilter =
  Html.div ( List.append ( Bem.createBE "index" "navigator-element" ) (Bem.createBE "index" "filter") )
    [ Html.div [] [ Html.text "🔍" ]
    , Html.input [ Html.Events.onInput UpdateFilter ] []
    ]

renderIndexList : IndexMeta -> List FilledIndexItem -> Html Msg
renderIndexList meta lst =
  case (List.length lst) of
    0 ->
      Html.div [] [ Html.text "no resources" ]
    _ ->
      Html.div (Bem.createBE "index" "container")
        (List.map renderIndexItem lst)

renderIndexItem : FilledIndexItem -> Html Msg
renderIndexItem item =
  Html.div [ Html.Attributes.class "index__grid" ]
    [ Html.a [ Html.Attributes.href item.path ]
      [ Html.img (List.append [ Html.Attributes.src item.thumbnail ] (Bem.createBE "index" "thumbnail")) []
      , Html.div (Bem.createBE "index" "label") [ Html.text item.original.title ]
      ]
    ]

subscriptions : Model -> Sub Msg
subscriptions model =
    Sub.none

